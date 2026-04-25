"""
Scraper — FCC (concursosfcc.com.br)
Cobre: concursos estaduais e municipais (TJ, MP, prefeituras, etc.)
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://www.concursosfcc.com.br"
URL_LISTA = f"{BASE}/concursos/index/situacao/A"
BANCA = "FCC"


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
            if not link_inscricao and ("inscri" in tl or "inscricao" in hl or "inscricoes" in hl):
                if href.startswith("http") and "fcc" not in href.lower().replace("fcc.com.br", ""):
                    link_inscricao = href
                elif "inscri" in hl:
                    link_inscricao = href

        import re
        texto = soup.get_text(" ")
        datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
        det["data_inscricao_inicio"] = parse_data_br(datas[0]) if len(datas) > 0 else None
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
            print(f"[FCC] HTTP {resp.status_code}")
            return []
        soup = BeautifulSoup(resp.text, "lxml")

        # FCC usa tabela com links para concursos
        linhas = soup.select("table tr") or soup.select(".concurso-row")
        vistos: set[str] = set()

        for row in linhas:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            link_tag = row.find("a", href=True)
            if not link_tag:
                continue
            url_det = href_abs(link_tag["href"], BASE)
            if url_det in vistos or url_det == URL_LISTA:
                continue
            vistos.add(url_det)

            orgao = limpar(cells[0].get_text()) if cells else limpar(link_tag.get_text())
            if not orgao or len(orgao) < 3 or orgao.lower() in ("concurso", "órgão", "orgao"):
                continue

            # Verifica data fim na própria lista antes de acessar detalhes
            data_fim_raw = limpar(cells[2].get_text()) if len(cells) > 2 else ""
            data_fim = parse_data_br(data_fim_raw)
            if encerrado(data_fim):
                continue

            det = await _detalhes(client, url_det)
            data_fim_final = data_fim or det.get("data_inscricao_fim")
            if encerrado(data_fim_final):
                continue

            resultados.append({
                "orgao": orgao,
                "cargo": "Vários cargos",
                "banca": BANCA,
                "nivel": inferir_nivel(orgao),
                "estado": inferir_estado(orgao + " " + url_det),
                "data_inscricao_fim": data_fim_final,
                **{k: v for k, v in det.items() if k != "data_inscricao_fim"},
            })
            await asyncio.sleep(0.4)

        # Fallback — links diretos para páginas de concurso
        if not resultados:
            for a in soup.find_all("a", href=True):
                href = href_abs(a["href"], BASE)
                if "/concursos/" in href and href not in vistos:
                    vistos.add(href)
                    orgao = limpar(a.get_text())
                    if not orgao or len(orgao) < 3:
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
        print(f"[FCC] Erro: {e}")

    print(f"[FCC] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
