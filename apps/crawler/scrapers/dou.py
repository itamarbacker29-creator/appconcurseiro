"""
Scraper — Diário Oficial da União via INLABS (inlabs.in.gov.br)
Baixa XML oficial do DOU (Seções 2 e 3) e extrai editais de concurso
com cargos, salários e vagas usando Claude Haiku.
"""
import asyncio
import io
import json
import os
import re
import zipfile
from datetime import date, timedelta

import anthropic
import httpx
from bs4 import BeautifulSoup

from .utils import encerrado, extrair_cargos_html, inferir_estado, inferir_nivel, limpar, parse_data_br, parse_salario, parse_vagas

INLABS_BASE = "https://inlabs.in.gov.br"
INLABS_EMAIL = os.environ.get("INLABS_EMAIL", "contato@otutor.com.br")
INLABS_PASSWORD = os.environ.get("INLABS_PASSWORD", "Guto113*")

# Seções do DOU: 2 = Executivo (autarquias, fundações), 3 = Anúncios (editais)
SECOES = [2, 3]
DIAS_ATRAS = 14

PALAVRAS_CONCURSO = {"edital", "concurso público", "processo seletivo", "certame"}

PROMPT_EXTRACAO = """Analise este trecho do Diário Oficial da União (edital de concurso público) e retorne APENAS este JSON:
{
  "orgao": "nome do órgão que realiza o concurso",
  "banca": "nome da banca organizadora ou null",
  "link_inscricao": "URL de inscrição mencionada no texto ou null",
  "data_inscricao_inicio": "YYYY-MM-DD ou null",
  "data_inscricao_fim": "YYYY-MM-DD ou null",
  "cargos": [
    {
      "nome": "nome exato do cargo",
      "vagas": 0,
      "salario": 0000.00,
      "escolaridade": "fundamental|medio|superior",
      "area": "tributario|seguranca|saude|educacao|judiciario|tecnologia|administrativo",
      "materias": ["Matéria 1", "Matéria 2"]
    }
  ]
}
Liste TODOS os cargos individualmente. Use null para campos ausentes, [] para listas vazias. Sem markdown."""


async def _login(client: httpx.AsyncClient) -> bool:
    """Autentica no INLABS. Retorna True se ok."""
    try:
        resp = await client.post(
            f"{INLABS_BASE}/logar.php",
            data={"email": INLABS_EMAIL, "password": INLABS_PASSWORD},
            follow_redirects=True,
            timeout=20,
        )
        # Login bem-sucedido: redireciona para página logada
        return resp.status_code == 200 and "sair" in resp.text.lower()
    except Exception as e:
        print(f"[DOU-INLABS] Erro no login: {e}")
        return False


async def _baixar_secao(client: httpx.AsyncClient, data_str: str, secao: int) -> bytes | None:
    """Baixa ZIP com XML do DOU para a data e seção."""
    try:
        resp = await client.get(
            f"{INLABS_BASE}/index.php",
            params={"p": data_str, "tp": "dou", "sc": secao},
            follow_redirects=True,
            timeout=60,
        )
        if resp.status_code == 200 and len(resp.content) > 1000:
            return resp.content
    except Exception:
        pass
    return None


def _parse_xml(xml_bytes: bytes, data_pub: str) -> list[dict]:
    """Extrai artigos de concurso do XML do DOU."""
    artigos = []
    try:
        soup = BeautifulSoup(xml_bytes, "lxml-xml")
        for art in soup.find_all(["article", "ARTICLE", "artigo", "ARTIGO"]):
            titulo_tag = art.find(["titulo", "TITULO", "title"])
            titulo = limpar(titulo_tag.get_text()) if titulo_tag else ""

            subtitulo_tag = art.find(["subtitulo", "SUBTITULO", "subtitle"])
            subtitulo = limpar(subtitulo_tag.get_text()) if subtitulo_tag else ""

            texto_tag = art.find(["texto", "TEXTO", "body"])
            texto = limpar(texto_tag.get_text(" ")) if texto_tag else art.get_text(" ")

            # Filtra apenas editais de concurso público
            conteudo = (titulo + " " + subtitulo + " " + texto[:300]).lower()
            if not any(p in conteudo for p in PALAVRAS_CONCURSO):
                continue
            if any(p in conteudo for p in ["vestibular", "enade", "pregão", "licitação"]):
                continue

            # Hierarquia do órgão
            hier = art.find(["identifica", "IDENTIFICA", "hierarchy"])
            hierarquia = limpar(hier.get_text(" ")) if hier else ""

            artigos.append({
                "titulo": titulo,
                "subtitulo": subtitulo,
                "texto": texto[:8000],  # limita para Claude
                "hierarquia": hierarquia,
                "data_pub": data_pub,
            })
    except Exception as e:
        print(f"[DOU-INLABS] Erro parse XML: {e}")
    return artigos


def _extrair_orgao(titulo: str, hierarquia: str) -> str:
    """Extrai nome do órgão da hierarquia ou do título."""
    if hierarquia:
        partes = re.split(r"[/,>|•\n]", hierarquia)
        for p in reversed(partes):  # pega o órgão mais específico
            p = limpar(p)
            if len(p) > 5 and p.upper() not in {"UNIÃO", "BRASIL", "REPÚBLICA", "PODER EXECUTIVO", "PODER JUDICIÁRIO"}:
                return p[:120]
    return limpar(titulo.split("–")[0].split("-")[0].split("N°")[0])[:120]


def _extrair_com_regex(texto: str) -> dict:
    """Extração rápida com regex — usado quando Claude não está disponível."""
    cargos = []
    # Tenta encontrar padrão: CARGO ... VAGAS ... SALÁRIO
    for m in re.finditer(
        r"cargo[:\s]+([^\n\r]{5,80})",
        texto, re.IGNORECASE,
    ):
        nome = limpar(m.group(1))
        if nome:
            cargos.append({"nome": nome, "vagas": None, "salario": None, "escolaridade": "superior", "area": "administrativo", "materias": []})

    datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
    return {
        "cargos": cargos[:10],
        "data_inscricao_fim": parse_data_br(datas[-1]) if datas else None,
        "data_inscricao_inicio": parse_data_br(datas[0]) if len(datas) >= 2 else None,
    }


def _chamar_claude(texto: str, titulo: str) -> dict:
    """Usa Claude Haiku para extrair dados estruturados do texto do edital."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _extrair_com_regex(texto)
    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": f"{PROMPT_EXTRACAO}\n\nTÍTULO: {titulo}\n\nTEXTO:\n{texto[:6000]}",
            }],
        )
        texto_resp = msg.content[0].text if msg.content else ""
        m = re.search(r"\{[\s\S]*\}", texto_resp)
        if not m:
            return _extrair_com_regex(texto)
        return json.loads(m.group(0))
    except Exception as e:
        print(f"[DOU-INLABS] Claude erro: {e}")
        return _extrair_com_regex(texto)


AREAS_VALIDAS = {"tributario", "seguranca", "saude", "educacao", "judiciario", "tecnologia", "administrativo"}


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []

    # 1. Login
    ok = await _login(client)
    if not ok:
        print("[DOU-INLABS] Login falhou — verifique credenciais")
        return []

    print("[DOU-INLABS] Login OK")

    # 2. Coleta artigos dos últimos DIAS_ATRAS dias
    artigos_total: list[dict] = []
    hoje = date.today()
    datas = [hoje - timedelta(days=i) for i in range(DIAS_ATRAS)]

    for d in datas:
        data_str = d.isoformat()
        for secao in SECOES:
            zip_bytes = await _baixar_secao(client, data_str, secao)
            if not zip_bytes:
                continue
            try:
                with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                    for nome_arq in zf.namelist():
                        if not nome_arq.lower().endswith(".xml"):
                            continue
                        xml_bytes = zf.read(nome_arq)
                        arts = _parse_xml(xml_bytes, data_str)
                        artigos_total.extend(arts)
                        if arts:
                            print(f"[DOU-INLABS] {data_str} Seção {secao}: {len(arts)} edital(is)")
            except Exception as e:
                print(f"[DOU-INLABS] Erro ZIP {data_str}/s{secao}: {e}")
            await asyncio.sleep(0.5)

    print(f"[DOU-INLABS] Total de artigos de concurso: {len(artigos_total)}")

    # 3. Extrai dados estruturados com Claude
    vistos: set[str] = set()
    for art in artigos_total[:40]:  # limite para controlar custo
        orgao = _extrair_orgao(art["titulo"], art["hierarquia"])
        if not orgao or len(orgao) < 3:
            continue

        chave = f"{orgao}|{art['data_pub']}"
        if chave in vistos:
            continue
        vistos.add(chave)

        dados = _chamar_claude(art["texto"], art["titulo"])
        cargos = dados.get("cargos") or []
        data_fim = dados.get("data_inscricao_fim")
        data_ini = dados.get("data_inscricao_inicio")
        link_inscricao = dados.get("link_inscricao")
        banca = dados.get("banca") or "Organização própria"

        if encerrado(data_fim):
            continue

        nivel = inferir_nivel(art["hierarquia"] + " " + orgao)
        estado = inferir_estado(art["hierarquia"] + " " + orgao)

        if cargos:
            for c in cargos:
                nome = limpar(str(c.get("nome") or "")).strip()
                if not nome or len(nome) < 3:
                    continue
                area = c.get("area") if c.get("area") in AREAS_VALIDAS else "administrativo"
                escolar = c.get("escolaridade") if c.get("escolaridade") in {"fundamental", "medio", "superior"} else "superior"
                resultados.append({
                    "orgao": orgao,
                    "cargo": nome[:200],
                    "banca": banca,
                    "nivel": nivel,
                    "estado": estado,
                    "vagas": c.get("vagas") if isinstance(c.get("vagas"), int) else None,
                    "salario": c.get("salario") if isinstance(c.get("salario"), (int, float)) else None,
                    "escolaridade": escolar,
                    "area": area,
                    "materias": c.get("materias") or [],
                    "data_inscricao_inicio": data_ini,
                    "data_inscricao_fim": data_fim,
                    "link_inscricao": link_inscricao,
                    "link_fonte": None,
                })
        else:
            # Sem cargos extraídos — insere o edital como um todo
            resultados.append({
                "orgao": orgao,
                "cargo": "Vários cargos",
                "banca": banca,
                "nivel": nivel,
                "estado": estado,
                "data_inscricao_inicio": data_ini,
                "data_inscricao_fim": data_fim,
                "link_inscricao": link_inscricao,
                "link_fonte": None,
            })

        await asyncio.sleep(0.2)

    print(f"[DOU-INLABS] {len(resultados)} registro(s) gerado(s)")
    return resultados
