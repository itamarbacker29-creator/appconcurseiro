"""
Scraper — AOCP / Instituto AOCP (institutoaocp.org.br)
Bloqueia bots — usa Playwright.
Cobre: concursos do Sul, Centro-Oeste e Norte do Brasil.
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado, extrair_cargos_html
from .pw_utils import get_page_html

BASE = "https://www.institutoaocp.org.br"
URLS_LISTA = [
    f"{BASE}/concursos",
    f"{BASE}/concursos/abertos",
    f"{BASE}/site/concursos-abertos",
]
BANCA = "AOCP"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
        # Tenta httpx primeiro; se bloquear usa Playwright
        resp = await client.get(url, headers=HEADERS)
        html = resp.text if resp.status_code == 200 else None
        if not html or len(html) < 500:
            html = await get_page_html(url)
        if not html:
            return det

        soup = BeautifulSoup(html, "lxml")
        link_pdf = None
        link_inscricao = None
        for a in soup.find_all("a", href=True):
            h = href_abs(a["href"], url)
            hl = h.lower()
            tl = limpar(a.get_text()).lower()
            if not link_pdf and hl.endswith(".pdf"):
                link_pdf = h
            if not link_inscricao and ("inscri" in tl or "inscri" in hl):
                link_inscricao = h

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
    html = None
    url_base = URLS_LISTA[0]

    for url in URLS_LISTA:
        html = await get_page_html(url, wait_selector="a[href]", timeout=20000)
        if html and len(html) > 1000:
            url_base = url
            break

    if not html:
        print("[AOCP] Playwright falhou em todas as URLs")
        return []

    try:
        soup = BeautifulSoup(html, "lxml")
        vistos: set[str] = set()

        items = (
            soup.select(".concurso") or soup.select("article")
            or soup.select(".item") or soup.select("table tr")
            or soup.select("li")
        )

        for item in items[:25]:
            link_tag = item.find("a", href=True)
            if not link_tag:
                continue
            href = href_abs(link_tag["href"], BASE)
            if href in vistos or BASE not in href:
                continue
            vistos.add(href)

            orgao = limpar(link_tag.get_text())
            if len(orgao) < 4:
                orgao = limpar(item.get_text())[:150]
            if len(orgao) < 4:
                continue

            texto = item.get_text(" ")
            datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
            data_fim = parse_data_br(datas[-1]) if datas else None
            if encerrado(data_fim):
                continue

            det = await _detalhes(client, href)
            cargos_lista = det.pop("_cargos", [])
            data_fim_ef = det.get("data_inscricao_fim") or data_fim
            if not encerrado(data_fim_ef):
                base = {
                    "orgao": orgao, "banca": BANCA,
                    "nivel": inferir_nivel(orgao), "estado": inferir_estado(orgao),
                    **det,
                }
                if cargos_lista:
                    for c in cargos_lista:
                        resultados.append({**base, "cargo": c["nome"],
                                           "vagas": c.get("vagas"), "salario": c.get("salario"),
                                           "escolaridade": c.get("escolaridade", "superior")})
                else:
                    resultados.append({**base, "cargo": "Vários cargos"})
            await asyncio.sleep(0.5)

    except Exception as e:
        print(f"[AOCP] Erro: {e}")

    print(f"[AOCP] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
