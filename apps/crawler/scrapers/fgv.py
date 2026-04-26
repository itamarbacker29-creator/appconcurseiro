"""
Scraper — FGV Conhecimentos (conhecimento.fgv.br/concursos)
Cobre: concursos federais, estaduais e municipais de alto nível
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado, extrair_cargos_html

BASE = "https://conhecimento.fgv.br"
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
            h = href_abs(a["href"], url)
            hl = h.lower()
            tl = limpar(a.get_text()).lower()
            # PDF: FGV publica sob /sites/default/files/concursos/
            if not link_pdf and (hl.endswith(".pdf") or "/sites/default/files/" in hl):
                link_pdf = h
            if not link_inscricao and ("inscri" in tl or "inscreva" in tl or "inscricao" in hl or "inscricao" in h.lower()):
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
            print(f"[FGV] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        vistos: set[str] = set()

        # Coleta todos os links /concursos/<slug> e /exames/<slug>
        hrefs_concurso = []
        for a in soup.find_all("a", href=True):
            raw = a["href"].strip()
            url_det = href_abs(raw, BASE)
            if url_det in vistos:
                continue
            if not re.search(r'conhecimento\.fgv\.br/(concursos|exames)/\w', url_det):
                continue
            if url_det == URL_LISTA:
                continue
            vistos.add(url_det)
            orgao = limpar(a.get_text())
            if len(orgao) < 4:
                continue
            hrefs_concurso.append((url_det, orgao))

        for url_det, orgao in hrefs_concurso[:25]:
            det = await _detalhes(client, url_det)
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
        print(f"[FGV] Erro: {e}")

    print(f"[FGV] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
