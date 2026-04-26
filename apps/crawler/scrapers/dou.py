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

# Seções do DOU: 1 = Executivo (nomeações, portarias), 2 = Executivo (autarquias), 3 = Anúncios (editais)
SECOES = [2, 3]
DIAS_ATRAS = 14

PALAVRAS_CONCURSO = {"edital", "concurso público", "processo seletivo", "certame"}
PALAVRAS_EXCLUIR = {"vestibular", "enade", "pregão", "licitação", "chamamento público"}

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
    """Autentica no INLABS."""
    try:
        resp = await client.post(
            f"{INLABS_BASE}/logar.php",
            data={"email": INLABS_EMAIL, "password": INLABS_PASSWORD},
            follow_redirects=True,
            timeout=20,
        )
        return resp.status_code == 200 and "sair" in resp.text.lower()
    except Exception as e:
        print(f"[DOU-INLABS] Erro no login: {e}")
        return False


async def _listar_zips(client: httpx.AsyncClient, data_str: str) -> dict[int, str]:
    """Retorna dict {secao: filename} para os ZIPs do DOU naquela data."""
    try:
        resp = await client.get(
            f"{INLABS_BASE}/index.php",
            params={"p": data_str},
            follow_redirects=True,
            timeout=20,
        )
        if resp.status_code != 200:
            return {}
        hrefs = re.findall(r'href="(\?p=[^"]+)"', resp.text)
        result: dict[int, str] = {}
        for h in hrefs:
            # Pega apenas os ZIPs principais (ex: 2026-04-24-DO3.zip), excluindo extras e PDFs
            m = re.search(r'dl=([\d-]+-DO(\d)\.zip)', h)
            if m:
                filename, secao = m.group(1), int(m.group(2))
                if secao in SECOES:
                    result[secao] = filename
        return result
    except Exception as e:
        print(f"[DOU-INLABS] Erro ao listar {data_str}: {e}")
        return {}


async def _baixar_zip(client: httpx.AsyncClient, data_str: str, filename: str) -> bytes | None:
    """Baixa ZIP com XMLs do DOU."""
    try:
        resp = await client.get(
            f"{INLABS_BASE}/index.php",
            params={"p": data_str, "dl": filename},
            follow_redirects=True,
            timeout=90,
        )
        if resp.status_code == 200 and resp.content[:2] == b"PK":
            return resp.content
    except Exception as e:
        print(f"[DOU-INLABS] Erro download {filename}: {e}")
    return None


def _parse_xml(xml_bytes: bytes, data_pub: str) -> list[dict]:
    """Extrai artigos de concurso de um XML do INLABS."""
    artigos = []
    try:
        soup = BeautifulSoup(xml_bytes, "lxml-xml")
        article = soup.find("article")
        if not article:
            return []

        art_type = article.get("artType", "")
        art_category = article.get("artCategory", "")
        pdf_page = article.get("pdfPage", "") or ""
        pub_date_raw = article.get("pubDate", data_pub)

        # Converte "24/04/2026" → "2026-04-24"
        data_iso = parse_data_br(pub_date_raw) or data_pub

        body = article.find("body")
        if not body:
            return []

        identifica_tag = body.find("Identifica")
        titulo_tag = body.find("Titulo")
        subtitulo_tag = body.find("SubTitulo")
        texto_tag = body.find("Texto")

        identifica = limpar(identifica_tag.get_text()) if identifica_tag else ""
        titulo = limpar(titulo_tag.get_text()) if titulo_tag else ""
        subtitulo = limpar(subtitulo_tag.get_text()) if subtitulo_tag else ""
        titulo_completo = titulo or identifica

        # Texto contém HTML — parseamos para extrair texto puro e tabelas
        texto_html = texto_tag.get_text(" ") if texto_tag else ""
        texto_soup = BeautifulSoup(texto_tag.decode_contents() if texto_tag else "", "html.parser") if texto_tag else None

        conteudo_check = (identifica + " " + titulo + " " + subtitulo + " " + texto_html[:800]).lower()

        # Requer "concurso público" OU ("processo seletivo" + cargo/vaga/inscriç)
        has_concurso = "concurso público" in conteudo_check or "concurso publico" in conteudo_check
        has_ps_cargo = "processo seletivo" in conteudo_check and any(
            p in conteudo_check for p in {"cargo", "vaga", "inscriç", "inscricao"}
        )
        if not (has_concurso or has_ps_cargo):
            return []

        if any(p in conteudo_check for p in PALAVRAS_EXCLUIR):
            return []

        cargos_tabela = extrair_cargos_html(texto_soup) if texto_soup else []

        artigos.append({
            "titulo": titulo_completo,
            "subtitulo": subtitulo,
            "texto": texto_html[:8000],
            "hierarquia": art_category,
            "data_pub": data_iso,
            "link_fonte": pdf_page,
            "cargos_tabela": cargos_tabela,
        })
    except Exception as e:
        print(f"[DOU-INLABS] Erro parse XML: {e}")
    return artigos


def _extrair_orgao(titulo: str, hierarquia: str) -> str:
    """Extrai nome do órgão da hierarquia ou do título."""
    if hierarquia:
        partes = re.split(r"[/,>|•\n]", hierarquia)
        for p in reversed(partes):
            p = limpar(p)
            if len(p) > 5 and p.upper() not in {"UNIÃO", "BRASIL", "REPÚBLICA", "PODER EXECUTIVO", "PODER JUDICIÁRIO", "GOVERNO DO ESTADO"}:
                return p[:120]
    return limpar(titulo.split("–")[0].split("-")[0].split("N°")[0])[:120]


def _extrair_com_regex(texto: str) -> dict:
    """Extração rápida com regex — usado quando Claude não está disponível."""
    cargos = []
    for m in re.finditer(r"cargo[:\s]+([^\n\r]{5,80})", texto, re.IGNORECASE):
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

    ok = await _login(client)
    if not ok:
        print("[DOU-INLABS] Login falhou — verifique credenciais")
        return []
    print("[DOU-INLABS] Login OK")

    artigos_total: list[dict] = []
    hoje = date.today()
    datas = [hoje - timedelta(days=i) for i in range(DIAS_ATRAS)]

    for d in datas:
        data_str = d.isoformat()
        zips = await _listar_zips(client, data_str)
        if not zips:
            continue

        for secao, filename in zips.items():
            zip_bytes = await _baixar_zip(client, data_str, filename)
            if not zip_bytes:
                continue
            try:
                with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                    xml_files = [n for n in zf.namelist() if n.lower().endswith(".xml")]
                    arts_dia = 0
                    for nome_arq in xml_files:
                        xml_bytes = zf.read(nome_arq)
                        arts = _parse_xml(xml_bytes, data_str)
                        artigos_total.extend(arts)
                        arts_dia += len(arts)
                    if arts_dia:
                        print(f"[DOU-INLABS] {data_str} Seção {secao}: {arts_dia} edital(is) em {len(xml_files)} XMLs")
            except Exception as e:
                print(f"[DOU-INLABS] Erro ZIP {data_str}/s{secao}: {e}")
            await asyncio.sleep(0.5)

    print(f"[DOU-INLABS] Total artigos de concurso: {len(artigos_total)}")

    vistos: set[str] = set()
    for art in artigos_total[:60]:
        orgao = _extrair_orgao(art["titulo"], art["hierarquia"])
        if not orgao or len(orgao) < 3:
            continue

        chave = f"{orgao}|{art['data_pub']}"
        if chave in vistos:
            continue
        vistos.add(chave)

        # Tenta cargos extraídos da tabela HTML primeiro
        cargos_tabela = art.get("cargos_tabela") or []

        if cargos_tabela:
            # Dados de datas/links via Claude (sem cargos, só metadados)
            dados = _chamar_claude(art["texto"], art["titulo"])
            data_fim = dados.get("data_inscricao_fim")
            data_ini = dados.get("data_inscricao_inicio")
            link_inscricao = dados.get("link_inscricao")
            banca = dados.get("banca") or "Organização própria"
        else:
            dados = _chamar_claude(art["texto"], art["titulo"])
            cargos_tabela = dados.get("cargos") or []
            data_fim = dados.get("data_inscricao_fim")
            data_ini = dados.get("data_inscricao_inicio")
            link_inscricao = dados.get("link_inscricao")
            banca = dados.get("banca") or "Organização própria"

        if encerrado(data_fim):
            continue

        nivel = inferir_nivel(art["hierarquia"] + " " + orgao)
        estado = inferir_estado(art["hierarquia"] + " " + orgao)

        if cargos_tabela:
            for c in cargos_tabela:
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
                    "link_fonte": art.get("link_fonte"),
                })
        else:
            # Sem cargos extraídos — não insere linha genérica, aguarda próxima passagem do crawler
            print(f"[DOU-INLABS] Sem cargos extraídos para: {orgao} ({art['data_pub']})")

        await asyncio.sleep(0.2)

    print(f"[DOU-INLABS] {len(resultados)} registro(s) gerado(s)")
    return resultados
