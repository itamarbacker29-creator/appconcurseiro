"""
Scraper — CEBRASPE (cebraspe.org.br/concursos)
Cobre: concursos federais e estaduais de alto perfil (PF, PRF, STJ, TCU, etc.)
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://www.cebraspe.org.br"
URL_LISTA = f"{BASE}/concursos"
BANCA = "CEBRASPE"


async def _detalhes(client: httpx.AsyncClient, url: str, orgao: str) -> dict | None:
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "lxml")

        # Link inscrição
        link_inscricao = None
        link_pdf = None
        for a in soup.find_all("a", href=True):
            href = href_abs(a["href"], url)
            txt = limpar(a.get_text()).lower()
            if not link_inscricao and ("inscri" in txt or "inscri" in href.lower()):
                link_inscricao = href
            if not link_pdf and href.lower().endswith(".pdf"):
                link_pdf = href

        # Datas — procura padrões comuns na página
        texto_pagina = soup.get_text(" ")
        import re
        datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto_pagina)
        data_fim = parse_data_br(datas[1]) if len(datas) >= 2 else parse_data_br(datas[0]) if datas else None
        data_ini = parse_data_br(datas[0]) if datas else None

        return {
            "link_inscricao": link_inscricao,
            "link_edital_pdf": link_pdf,
            "link_fonte": url,
            "data_inscricao_inicio": data_ini,
            "data_inscricao_fim": data_fim,
        }
    except Exception:
        return None


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    try:
        resp = await client.get(URL_LISTA)
        if resp.status_code != 200:
            print(f"[CEBRASPE] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        # Cards de concurso — CEBRASPE usa divs com classe "concurso" ou similar
        cards = (
            soup.select(".concurso-item")
            or soup.select(".card-concurso")
            or soup.select("article")
            or soup.select(".item-concurso")
        )

        if not cards:
            # Fallback: links que contêm "/concurso/" ou "/certames/"
            links_vistos: set[str] = set()
            for a in soup.find_all("a", href=True):
                href = href_abs(a["href"], BASE)
                if "/concurso" in href.lower() and href not in links_vistos and href != URL_LISTA:
                    links_vistos.add(href)
                    orgao = limpar(a.get_text())
                    if not orgao or len(orgao) < 3:
                        continue
                    det = await _detalhes(client, href, orgao)
                    if det and not encerrado(det.get("data_inscricao_fim")):
                        resultados.append({
                            "orgao": orgao,
                            "cargo": "Vários cargos",
                            "banca": BANCA,
                            "nivel": inferir_nivel(orgao),
                            "estado": inferir_estado(orgao),
                            **det,
                        })
                    await asyncio.sleep(0.3)
            return resultados

        for card in cards[:30]:
            orgao_tag = card.find(["h2", "h3", "h4", "strong", "b"])
            orgao = limpar(orgao_tag.get_text()) if orgao_tag else limpar(card.get_text())
            if not orgao or len(orgao) < 3:
                continue
            link_card = card.find("a", href=True)
            if not link_card:
                continue
            url_det = href_abs(link_card["href"], BASE)
            det = await _detalhes(client, url_det, orgao)
            if det and not encerrado(det.get("data_inscricao_fim")):
                resultados.append({
                    "orgao": orgao,
                    "cargo": "Vários cargos",
                    "banca": BANCA,
                    "nivel": inferir_nivel(orgao),
                    "estado": inferir_estado(orgao),
                    **det,
                })
            await asyncio.sleep(0.3)

    except Exception as e:
        print(f"[CEBRASPE] Erro: {e}")

    print(f"[CEBRASPE] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
