"""
Scraper — Cesgranrio (cesgranrio.org.br)
Cobre: Petrobras, BNDES, Banco do Brasil, LIQUIGÁS, BANESE e autarquias federais
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado, extrair_cargos_html

BASE = "https://www.cesgranrio.org.br"
URL_LISTA = f"{BASE}/concursos/?ucat=25"  # categoria 25 = Em Andamento
BANCA = "Cesgranrio"


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
    try:
        resp = await client.get(URL_LISTA, headers={**HEADERS, "Accept": "text/html"})
        if resp.status_code != 200:
            print(f"[CESGRANRIO] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        vistos: set[str] = set()
        # WordPress Uncode: cards em div.isotope-container div.tmb
        cards = soup.select("div.isotope-container div.tmb")
        if not cards:
            cards = soup.find_all("a", href=lambda h: h and "/concurso/" in h)

        for card in cards[:30]:
            link_tag = card if card.name == "a" else card.find("a", href=True)
            if not link_tag:
                continue
            href = href_abs(link_tag.get("href", ""), BASE)
            if href in vistos or "/concurso/" not in href:
                continue
            vistos.add(href)

            titulo_tag = card.find(["h1", "h2", "h3", "h4"])
            orgao = limpar(titulo_tag.get_text()) if titulo_tag else limpar(link_tag.get_text())
            if len(orgao) < 4:
                continue

            # Exclui vestibulares e exames de ordem
            if any(p in orgao.lower() for p in ["vestibular", "enade", "provão", "oab exame"]):
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
                    resultados.append({**base, "cargo": "Vários cargos"})
            await asyncio.sleep(0.4)

    except Exception as e:
        print(f"[CESGRANRIO] Erro: {e}")

    print(f"[CESGRANRIO] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
