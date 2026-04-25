"""
Scraper — FGV Projetos (concursos.fgv.br)
Cobre: concursos federais, estaduais e municipais de alto nível
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://concursos.fgv.br"
URL_LISTA = f"{BASE}/concursos"
BANCA = "FGV"


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
            if not link_pdf and hl.endswith(".pdf"):
                link_pdf = href
            if not link_inscricao and ("inscri" in tl or "inscricao" in hl):
                link_inscricao = href

        import re
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
        resp = await client.get(URL_LISTA)
        if resp.status_code != 200:
            print(f"[FGV] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        vistos: set[str] = set()
        selectors = [
            ".views-row", ".concurso-item", "article",
            ".view-content .views-row", ".field-content",
        ]
        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        if cards:
            for card in cards[:25]:
                link_tag = card.find("a", href=True)
                if not link_tag:
                    continue
                url_det = href_abs(link_tag["href"], BASE)
                if url_det in vistos:
                    continue
                vistos.add(url_det)

                orgao_tag = card.find(["h2", "h3", "h4"])
                orgao = limpar(orgao_tag.get_text()) if orgao_tag else limpar(link_tag.get_text())
                if not orgao or len(orgao) < 3:
                    continue

                det = await _detalhes(client, url_det)
                if not encerrado(det.get("data_inscricao_fim")):
                    resultados.append({
                        "orgao": orgao,
                        "cargo": "Vários cargos",
                        "banca": BANCA,
                        "nivel": inferir_nivel(orgao),
                        "estado": inferir_estado(orgao),
                        **det,
                    })
                await asyncio.sleep(0.4)
        else:
            # Fallback genérico
            for a in soup.find_all("a", href=True):
                href = href_abs(a["href"], BASE)
                if BASE in href and href != URL_LISTA and href not in vistos:
                    orgao = limpar(a.get_text())
                    if len(orgao) < 5:
                        continue
                    vistos.add(href)
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
                    await asyncio.sleep(0.4)

    except Exception as e:
        print(f"[FGV] Erro: {e}")

    print(f"[FGV] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
