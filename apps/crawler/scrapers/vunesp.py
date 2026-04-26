"""
Scraper — Vunesp (vunesp.com.br)
Retorna 403 para bots — usa Playwright para renderizar.
Cobre: prefeituras e tribunais do estado de SP.
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado, extrair_cargos_html
from .pw_utils import get_page_html

BASE = "https://www.vunesp.com.br"
URLS_LISTA = [
    f"{BASE}/home/concursos_em_aberto",
    f"{BASE}/VUNE2501/pages/home.html",
    BASE,
]
BANCA = "Vunesp"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
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
    url_base = BASE

    for url in URLS_LISTA:
        html = await get_page_html(url, wait_selector="a[href]")
        if html and len(html) > 1000:
            url_base = url
            break

    if not html:
        print("[VUNESP] Playwright falhou em todas as URLs")
        return []

    try:
        soup = BeautifulSoup(html, "lxml")
        vistos: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = href_abs(a["href"], url_base)
            if href in vistos or BASE not in href:
                continue
            tl = limpar(a.get_text()).lower()
            hl = href.lower()
            if not any(p in tl + hl for p in ["concurso", "processo", "edital", "inscri", "seletivo"]):
                continue
            vistos.add(href)
            orgao = limpar(a.get_text())
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
            await asyncio.sleep(0.5)

    except Exception as e:
        print(f"[VUNESP] Erro: {e}")

    print(f"[VUNESP] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
