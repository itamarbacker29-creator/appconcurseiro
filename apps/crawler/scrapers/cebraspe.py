"""
Scraper — CEBRASPE (cebraspe.org.br/concursos)
React SPA — usa Playwright para renderizar JS.
Cobre: PF, PRF, STJ, TCU, TJDFT e concursos federais de alto perfil.
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado
from .pw_utils import get_page_html

BASE = "https://www.cebraspe.org.br"
URL_LISTA = f"{BASE}/concursos"
BANCA = "CEBRASPE"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
        # Página de detalhe também pode ser React; tenta httpx primeiro
        resp = await client.get(url)
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
        # CEBRASPE é React SPA — precisa de Playwright
        html = await get_page_html(URL_LISTA, wait_selector="a[href*='/concurso']")
        if not html:
            print("[CEBRASPE] Playwright falhou")
            return []

        soup = BeautifulSoup(html, "lxml")
        vistos: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = href_abs(a["href"], BASE)
            if href in vistos or "/concurso" not in href.lower() or href == URL_LISTA:
                continue
            vistos.add(href)
            orgao = limpar(a.get_text())
            if len(orgao) < 4:
                continue

            det = await _detalhes(client, href)
            if not encerrado(det.get("data_inscricao_fim")):
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
        print(f"[CEBRASPE] Erro: {e}")

    print(f"[CEBRASPE] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
