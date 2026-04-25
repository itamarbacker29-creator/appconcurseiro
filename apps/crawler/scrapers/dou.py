"""
Scraper — Diário Oficial da União (in.gov.br)
Cobre: editais de abertura de concursos publicados no DOU (Seção 3)
Usado principalmente para: concursos de órgãos que organizam por conta própria
(TCU, STF, Receita Federal, Banco Central, autarquias sem banca terceirizada)
"""
import asyncio
import re
import httpx
from bs4 import BeautifulSoup
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE_DOU = "https://www.in.gov.br"
# Busca DOU por "edital" + "concurso público" na seção 2 e 3 dos últimos 14 dias
SEARCH_URL = (
    "https://www.in.gov.br/consulta/-/busca-dou"
    "?q=%22edital+de+abertura%22+%22concurso+p%C3%BAblico%22"
    "&s=do2,do3"
    "&exactDate=15"
    "&sortType=0"
)
BANCA = "Organização própria"


def _extrair_orgao(titulo: str, subtitulo: str) -> str:
    """Tenta extrair o nome do órgão do título/subtítulo da publicação."""
    # Subtítulo geralmente contém o órgão: "MINISTÉRIO DA FAZENDA / RECEITA FEDERAL..."
    if subtitulo and len(subtitulo) > 3:
        return limpar(subtitulo.split("/")[0].split("–")[0].split("-")[0])[:100]
    return limpar(titulo.split("–")[0].split("-")[0])[:100]


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    try:
        resp = await client.get(SEARCH_URL, headers={**HEADERS, "Accept": "text/html"})
        if resp.status_code != 200:
            print(f"[DOU] HTTP {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        # Resultados da busca do DOU — cada resultado é um artigo/div
        items = (
            soup.select(".resultado-dou")
            or soup.select(".resultado")
            or soup.select("article")
            or soup.select(".search-result")
        )

        if not items:
            # Fallback: pega todos os links que apontam para publicações do DOU
            items = soup.find_all("a", href=True)

        vistos: set[str] = set()
        for item in items[:30]:
            link_tag = item if item.name == "a" else item.find("a", href=True)
            if not link_tag:
                continue
            href = href_abs(link_tag.get("href", ""), BASE_DOU)
            if not href.startswith(BASE_DOU) or href in vistos:
                continue
            vistos.add(href)

            titulo_tag = item.find(["h3", "h4", "strong", "b"])
            titulo = limpar(titulo_tag.get_text()) if titulo_tag else limpar(link_tag.get_text())
            if not titulo or len(titulo) < 5:
                continue

            # Só processa publicações que parecem ser editais de concurso
            titulo_lower = titulo.lower()
            if not any(p in titulo_lower for p in ["edital", "concurso", "processo seletivo", "certame"]):
                continue

            # Acessa a publicação para extrair detalhes
            link_pdf = None
            link_inscricao = None
            orgao = titulo
            data_fim = None

            try:
                resp2 = await client.get(href)
                if resp2.status_code == 200:
                    s2 = BeautifulSoup(resp2.text, "lxml")
                    texto = s2.get_text(" ")

                    # Tenta extrair órgão do cabeçalho da publicação
                    header = s2.select_one(".orgao-dou, .subtitulo, .dou-subtitulo, h2")
                    if header:
                        orgao = limpar(header.get_text())[:100]

                    # Extrai link de inscrição do corpo do texto
                    for a in s2.find_all("a", href=True):
                        h2 = href_abs(a["href"], href)
                        h2l = h2.lower()
                        tl = limpar(a.get_text()).lower()
                        if not link_inscricao and ("inscri" in tl or "inscricao" in h2l):
                            link_inscricao = h2
                        if not link_pdf and h2l.endswith(".pdf"):
                            link_pdf = h2

                    # Tenta extrair data de encerramento das inscrições
                    m_fim = re.search(
                        r"encerramento.{0,30}(\d{1,2}/\d{1,2}/\d{4})|"
                        r"at[eé].{0,10}(\d{1,2}/\d{1,2}/\d{4})|"
                        r"prazo.{0,30}(\d{1,2}/\d{1,2}/\d{4})",
                        texto, re.IGNORECASE
                    )
                    if m_fim:
                        data_fim = parse_data_br(next(g for g in m_fim.groups() if g))
                    else:
                        datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
                        if len(datas) >= 2:
                            data_fim = parse_data_br(datas[1])

            except Exception:
                pass

            if encerrado(data_fim):
                continue

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
            await asyncio.sleep(0.5)

    except Exception as e:
        print(f"[DOU] Erro: {e}")

    print(f"[DOU] {len(resultados)} publicação(ões) encontrada(s)")
    return resultados
