"""
Scraper — Quadrix (quadrix.org.br)
ASP.NET, bloqueia bots — usa Playwright.
Cobre: CRFs, CROs, CRMs, CFMs, conselhos profissionais e prefeituras.
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado
from .pw_utils import get_page_html

BASE = "https://www.quadrix.org.br"
URL_LISTA = f"{BASE}/todos-os-concursos/inscricoes-abertas.aspx"
BANCA = "Quadrix"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
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
    except Exception:
        pass
    return det


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    try:
        html = await get_page_html(URL_LISTA, wait_selector="a[href*='quadrix']", timeout=20000)
        if not html:
            print("[QUADRIX] Playwright falhou")
            return []

        soup = BeautifulSoup(html, "lxml")
        vistos: set[str] = set()

        rows = (
            soup.select("table tr")
            or soup.select(".concurso-item")
            or soup.select("ul li")
            or soup.select("article")
        )

        for row in rows[:30]:
            link_tag = row.find("a", href=True)
            if not link_tag:
                continue
            href = href_abs(link_tag["href"], BASE)
            if href in vistos:
                continue
            vistos.add(href)

            cells = row.find_all(["td", "th"])
            orgao = limpar(cells[0].get_text()) if cells else limpar(link_tag.get_text())
            if not orgao or len(orgao) < 4:
                continue

            texto_row = row.get_text(" ")
            datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto_row)
            data_fim = parse_data_br(datas[-1]) if datas else None
            if encerrado(data_fim):
                continue

            det = await _detalhes(client, href)
            if not encerrado(det.get("data_inscricao_fim") or data_fim):
                resultados.append({
                    "orgao": orgao,
                    "cargo": "Vários cargos",
                    "banca": BANCA,
                    "nivel": inferir_nivel(orgao),
                    "estado": inferir_estado(orgao),
                    **det,
                })
            await asyncio.sleep(0.5)

    except Exception as e:
        print(f"[QUADRIX] Erro: {e}")

    print(f"[QUADRIX] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
