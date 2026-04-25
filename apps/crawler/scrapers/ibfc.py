"""
Scraper — IBFC (concursos.ibfc.org.br)
Cobre: concursos municipais e estaduais, área de saúde e segurança
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://concursos.ibfc.org.br"
URL_LISTA = f"{BASE}/index/abertos/"
BANCA = "IBFC"


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    det: dict = {"link_fonte": url}
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return det
        soup = BeautifulSoup(resp.text, "lxml")

        # PDFs em div#aba-anexos-lista li.pdf a
        link_pdf = None
        for a in soup.select("#aba-anexos-lista li.pdf a[href]"):
            if a["href"].lower().endswith(".pdf"):
                link_pdf = a["href"]
                break
        if not link_pdf:
            for a in soup.find_all("a", href=True):
                if a["href"].lower().endswith(".pdf"):
                    link_pdf = a["href"]
                    break

        link_inscricao = None
        for a in soup.find_all("a", href=True):
            tl = limpar(a.get_text()).lower()
            hl = a["href"].lower()
            if "inscri" in tl or "inscri" in hl or "termo" in hl:
                raw = a["href"]
                link_inscricao = raw if raw.startswith("http") else href_abs(raw, BASE)
                break

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
        resp = await client.get(URL_LISTA, headers={**HEADERS, "Accept": "text/html"})
        if resp.status_code != 200:
            print(f"[IBFC] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        vistos: set[str] = set()
        # Cada concurso: <a class="lista-concurso" href="/informacoes/{ID}/">
        for a in soup.select("a.lista-concurso[href]"):
            href = href_abs(a["href"], BASE)
            if href in vistos:
                continue
            vistos.add(href)

            orgao_tag = a.select_one(".texto_cliente")
            orgao = limpar(orgao_tag.get_text()) if orgao_tag else limpar(a.get_text())
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
            await asyncio.sleep(0.4)

    except Exception as e:
        print(f"[IBFC] Erro: {e}")

    print(f"[IBFC] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
