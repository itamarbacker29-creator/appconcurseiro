"""
Scraper — Diário Oficial da União (in.gov.br)
Usa Playwright para renderizar JS e interceptar a resposta da busca.
Cobre: editais de concursos publicados nas seções 2 e 3 do DOU nos últimos 15 dias.
"""
import asyncio
import json
import re
import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from .utils import HEADERS, limpar, parse_data_br, href_abs, encerrado, inferir_nivel, inferir_estado

BASE_DOU = "https://www.in.gov.br"
WEB_BASE = f"{BASE_DOU}/web/dou/-/"
SEARCH_URL = (
    f"{BASE_DOU}/consulta/-/buscar/dou"
    "?q=%22edital+de+abertura%22+%22concurso+p%C3%BAblico%22"
    "&exactDate=15&sortType=0&s=do2&s=do3"
)
BANCA = "Organização própria"


def _extrair_orgao(titulo: str, hierarquia: str) -> str:
    """Extrai nome do órgão da hierarquia ou do título."""
    if hierarquia:
        partes = re.split(r"[/,>|]", hierarquia)
        for p in partes:
            p = limpar(p)
            if len(p) > 5 and p.upper() not in ("UNIÃO", "BRASIL", "REPÚBLICA"):
                return p[:100]
    return limpar(titulo.split("–")[0].split("-")[0])[:100]


async def _detalhes(client: httpx.AsyncClient, url: str) -> dict:
    """Busca link de inscrição e PDF na página do artigo do DOU."""
    det: dict = {}
    try:
        resp = await client.get(url, headers=HEADERS)
        if resp.status_code != 200:
            return det
        soup = BeautifulSoup(resp.text, "lxml")
        texto = soup.get_text(" ")

        link_pdf = None
        link_inscricao = None
        for a in soup.find_all("a", href=True):
            h = href_abs(a["href"], url)
            hl = h.lower()
            tl = limpar(a.get_text()).lower()
            if not link_pdf and hl.endswith(".pdf"):
                link_pdf = h
            if not link_inscricao and ("inscri" in tl or "inscricao" in hl):
                link_inscricao = h

        # Data de encerramento das inscrições
        m_fim = re.search(
            r"encerramento.{0,30}(\d{1,2}/\d{1,2}/\d{4})|"
            r"at[eé].{0,10}(\d{1,2}/\d{1,2}/\d{4})|"
            r"prazo.{0,30}(\d{1,2}/\d{1,2}/\d{4})",
            texto, re.IGNORECASE,
        )
        if m_fim:
            det["data_inscricao_fim"] = parse_data_br(next(g for g in m_fim.groups() if g))
        else:
            datas = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", texto)
            if len(datas) >= 2:
                det["data_inscricao_fim"] = parse_data_br(datas[1])

        det["link_edital_pdf"] = link_pdf
        det["link_inscricao"] = link_inscricao
    except Exception:
        pass
    return det


async def scrape(client: httpx.AsyncClient) -> list[dict]:
    resultados = []
    items = []

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page = await browser.new_page(
                user_agent="Mozilla/5.0 (compatible; Ro-DOU/0.7; +https://github.com/gestaogovbr/Ro-dou)",
            )

            # Intercepta respostas para capturar o JSON quando a página carregar
            captured: list[dict] = []

            async def handle_response(response):
                if "buscar/dou" in response.url and response.status == 200:
                    try:
                        html = await response.text()
                        m = re.search(
                            r'id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>(.*?)</script>',
                            html, re.DOTALL,
                        )
                        if m:
                            data = json.loads(m.group(1).strip())
                            arr = data.get("jsonArray") or []
                            if arr:
                                captured.extend(arr)
                    except Exception:
                        pass

            page.on("response", handle_response)

            await page.goto(SEARCH_URL, wait_until="networkidle", timeout=30000)

            # Aguarda resultados aparecerem no DOM
            try:
                await page.wait_for_selector(".resultado-dou, .resultado, article.resultado", timeout=10000)
            except Exception:
                pass

            # Tenta extrair do HTML renderizado se a intercepção não capturou
            if not captured:
                html = await page.content()
                m = re.search(
                    r'id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>(.*?)</script>',
                    html, re.DOTALL,
                )
                if m:
                    data = json.loads(m.group(1).strip())
                    captured.extend(data.get("jsonArray") or [])

                # Fallback: parseia links de artigos diretamente do HTML renderizado
                if not captured:
                    soup = BeautifulSoup(html, "lxml")
                    for a in soup.find_all("a", href=True):
                        h = href_abs(a["href"], BASE_DOU)
                        if "/web/dou/-/" in h:
                            titulo = limpar(a.get_text())
                            if titulo and len(titulo) > 5:
                                captured.append({"urlTitle": h.split("/web/dou/-/")[-1], "title": titulo, "hierarchyStr": ""})

            await browser.close()
            items = captured

    except Exception as e:
        print(f"[DOU] Playwright erro: {e}")

    print(f"[DOU] {len(items)} artigo(s) encontrado(s) na busca")

    vistos: set[str] = set()
    for item in items[:30]:
        url_title = item.get("urlTitle", "")
        titulo = item.get("title", "")
        hierarquia = item.get("hierarchyStr", "")

        # Filtra só editais de concurso
        titulo_lower = titulo.lower()
        if not any(p in titulo_lower for p in ["edital", "concurso", "processo seletivo", "certame"]):
            continue

        href = item.get("href") or (WEB_BASE + url_title if url_title else None)
        if not href or href in vistos:
            continue
        vistos.add(href)

        orgao = _extrair_orgao(titulo, hierarquia)
        if not orgao or len(orgao) < 3:
            continue

        det = await _detalhes(client, href)
        if encerrado(det.get("data_inscricao_fim")):
            continue

        resultados.append({
            "orgao": orgao,
            "cargo": "Vários cargos",
            "banca": BANCA,
            "nivel": inferir_nivel(hierarquia + " " + orgao),
            "estado": inferir_estado(hierarquia + " " + orgao),
            "link_edital_pdf": det.get("link_edital_pdf"),
            "link_inscricao": det.get("link_inscricao"),
            "link_fonte": href,
            "data_inscricao_fim": det.get("data_inscricao_fim"),
        })
        await asyncio.sleep(0.4)

    print(f"[DOU] {len(resultados)} edital(is) de concurso encontrado(s)")
    return resultados
