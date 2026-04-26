"""
Scraper — FCC (concursosfcc.com.br)
Cobre: TJ, MP, Defensoria, Legislativo estadual e municipal
"""
import asyncio
import re
from urllib.parse import parse_qs, urlparse
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado, extrair_cargos_html

BASE = "https://www.concursosfcc.com.br"
URL_LISTA = f"{BASE}/concursos/"
BANCA = "FCC"


def _extrair_pdf_fcc(href: str, base: str) -> str:
    """FCC envolve PDFs num viewer: ?file=URL. Extrai a URL real."""
    parsed = urlparse(href)
    qs = parse_qs(parsed.query)
    if "file" in qs:
        return qs["file"][0]
    return href_abs(href, base)


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return det
        soup = BeautifulSoup(resp.text, "lxml")

        link_pdf = None
        link_inscricao = None

        # PDFs em div.linkArquivo > a (href pode ser viewer com ?file=PDF)
        for a in soup.select("div.linkArquivo a[href]"):
            pdf = _extrair_pdf_fcc(a["href"], url)
            if pdf.lower().endswith(".pdf") and not link_pdf:
                link_pdf = pdf

        for a in soup.find_all("a", href=True):
            tl = limpar(a.get_text()).lower()
            hl = a["href"].lower()
            if not link_inscricao and ("inscri" in tl or "inscri" in hl):
                link_inscricao = href_abs(a["href"], url)

        texto = soup.get_text(" ")
        datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
        det["data_inscricao_inicio"] = parse_data_br(datas[0]) if datas else None
        det["data_inscricao_fim"] = parse_data_br(datas[1]) if len(datas) > 1 else None
        det["link_edital_pdf"] = link_pdf
        det["link_inscricao"] = link_inscricao
        det["_cargos"] = extrair_cargos_html(soup)
    except Exception:
        pass
    return det


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    try:
        resp = await client.get(URL_LISTA, headers={**HEADERS, "Accept": "text/html"})
        if resp.status_code != 200:
            print(f"[FCC] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        vistos: set[str] = set()
        secao_aberta = None

        # FCC agrupa por seção (div.rotuloTopico); só pega "Inscrições abertas"
        for tag in soup.find_all(["div", "a"]):
            if tag.name == "div" and any("rotuloTopico" in c for c in tag.get("class", [])):
                texto_secao = tag.get_text(strip=True).lower()
                secao_aberta = "aberta" in texto_secao or "inscri" in texto_secao
            if tag.name == "a" and any("textoPreto" in c for c in tag.get("class", [])):
                if secao_aberta is False:
                    continue
                href = href_abs(tag.get("href", ""), BASE)
                if href in vistos or BASE not in href:
                    continue
                vistos.add(href)
                orgao = limpar(tag.get_text())
                if len(orgao) < 4:
                    continue
                det = await _detalhes(client, href)
                cargos_lista = det.pop("_cargos", [])
                if not encerrado(det.get("data_inscricao_fim")):
                    base = {"orgao": orgao, "banca": BANCA,
                            "nivel": inferir_nivel(orgao), "estado": inferir_estado(orgao), **det}
                    if cargos_lista:
                        for c in cargos_lista:
                            resultados.append({**base, "cargo": c["nome"],
                                               "vagas": c.get("vagas"), "salario": c.get("salario"),
                                               "escolaridade": c.get("escolaridade", "superior")})
                    else:
                        pass  # sem cargos extraídos — não insere linha genérica
                await asyncio.sleep(0.4)

    except Exception as e:
        print(f"[FCC] Erro: {e}")

    print(f"[FCC] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
