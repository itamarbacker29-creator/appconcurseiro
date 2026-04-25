"""
Scraper — Vunesp (vunesp.com.br)
Cobre: concursos do estado de SP, TJs, prefeituras paulistas
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://www.vunesp.com.br"
URLS = [
    f"{BASE}/home/concursos_em_aberto",
    f"{BASE}/concursos/abertos",
    BASE,
]
BANCA = "Vunesp"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return det
        soup = BeautifulSoup(resp.text, "lxml")
        link_pdf = None
        link_inscricao = None
        for a in soup.find_all("a", href=True):
            href = href_abs(a["href"], url)
            hl = href.lower()
            tl = limpar(a.get_text()).lower()
            if not link_pdf and hl.endswith(".pdf") and ("edital" in hl or "edital" in tl):
                link_pdf = href
            if not link_inscricao and ("inscri" in tl or "inscricao" in hl):
                link_inscricao = href
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
    soup = None
    url_usada = ""

    for url in URLS:
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                url_usada = url
                break
        except Exception:
            continue

    if not soup:
        print("[VUNESP] Não foi possível acessar o site")
        return []

    vistos: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = href_abs(a["href"], BASE)
        if href in vistos or BASE not in href:
            continue
        tl = limpar(a.get_text()).lower()
        hl = href.lower()
        # Filtra links que parecem ser de concursos
        if not any(p in hl or p in tl for p in ["concurso", "processo", "edital", "certame"]):
            continue
        vistos.add(href)
        orgao = limpar(a.get_text())
        if len(orgao) < 5:
            # Tenta pegar o texto do elemento pai
            pai = a.find_parent(["li", "div", "tr", "td"])
            if pai:
                orgao = limpar(pai.get_text())[:100]
        if len(orgao) < 5:
            continue
        det = await _detalhes(client, href)
        if not encerrado(det.get("data_inscricao_fim")):
            resultados.append({
                "orgao": orgao,
                "cargo": "Vários cargos",
                "banca": BANCA,
                "nivel": inferir_nivel(orgao),
                "estado": inferir_estado(orgao + " SP"),
                **det,
            })
        await asyncio.sleep(0.4)
        if len(resultados) >= 20:
            break

    print(f"[VUNESP] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
