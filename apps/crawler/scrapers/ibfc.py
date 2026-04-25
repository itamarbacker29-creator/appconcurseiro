"""
Scraper — IBFC (ibfc.org.br)
Cobre: concursos municipais e estaduais, área de saúde e segurança
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE = "https://www.ibfc.org.br"
URLS_LISTA = [
    f"{BASE}/concursoativo",
    f"{BASE}/concursos",
    f"{BASE}/concursos/abertos",
]
BANCA = "IBFC"


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    soup = None

    for url in URLS_LISTA:
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                break
        except Exception:
            continue

    if not soup:
        print("[IBFC] Não foi possível acessar o site")
        return []

    vistos: set[str] = set()
    # IBFC geralmente tem uma tabela ou lista de concursos ativos
    rows = soup.select("table tr") or soup.select(".concurso") or soup.select("article") or soup.select("li")

    for row in rows[:30]:
        link_tag = row.find("a", href=True)
        if not link_tag:
            continue
        href = href_abs(link_tag["href"], BASE)
        if href in vistos or not href.startswith("http"):
            continue
        vistos.add(href)

        orgao = limpar(link_tag.get_text())
        if not orgao or len(orgao) < 4:
            # Tenta o texto da linha toda
            orgao = limpar(row.get_text())[:150]
        if len(orgao) < 4:
            continue

        # Busca data na linha
        texto_row = row.get_text(" ")
        datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto_row)
        data_fim = parse_data_br(datas[-1]) if datas else None
        if encerrado(data_fim):
            continue

        # Detalhes da página do concurso
        link_pdf = None
        link_inscricao = None
        try:
            resp2 = await client.get(href)
            if resp2.status_code == 200:
                soup2 = BeautifulSoup(resp2.text, "lxml")
                for a in soup2.find_all("a", href=True):
                    h2 = href_abs(a["href"], href)
                    h2l = h2.lower()
                    tl = limpar(a.get_text()).lower()
                    if not link_pdf and h2l.endswith(".pdf") and ("edital" in h2l or "edital" in tl):
                        link_pdf = h2
                    if not link_inscricao and ("inscri" in tl or "inscricao" in h2l):
                        link_inscricao = h2
                if not datas:
                    t2 = soup2.get_text(" ")
                    datas2 = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", t2)
                    data_fim = parse_data_br(datas2[1]) if len(datas2) > 1 else parse_data_br(datas2[0]) if datas2 else None
        except Exception:
            pass

        if not encerrado(data_fim):
            resultados.append({
                "orgao": orgao,
                "cargo": "Vários cargos",
                "banca": BANCA,
                "nivel": inferir_nivel(orgao),
                "estado": inferir_estado(orgao),
                "link_edital_pdf": link_pdf,
                "link_inscricao": link_inscricao,
                "link_fonte": href,
                "data_inscricao_fim": data_fim,
            })
        await asyncio.sleep(0.4)

    print(f"[IBFC] {len(resultados)} concurso(s) encontrado(s)")
    return resultados
