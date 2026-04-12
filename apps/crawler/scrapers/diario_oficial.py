from bs4 import BeautifulSoup
from scrapers.base_scraper import fetch_page
from typing import List


async def scrape_do() -> List[str]:
    """Scrapa editais do Diário Oficial via IN (in.gov.br)."""
    print("[DO] Iniciando scraping...")
    url = "https://www.in.gov.br/consulta/-/buscar/dou?q=edital+concurso+p%C3%BAblico&s=do1&exactDate=personalizado&delta=20&sortType=0"
    html = await fetch_page(url)

    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    textos = []

    resultados = soup.select(".resultado") or soup.select("article") or soup.select(".materia-titulo")
    for r in resultados[:15]:
        texto = r.get_text(separator="\n", strip=True)
        if len(texto) > 80:
            textos.append(texto)

    print(f"[DO] {len(textos)} editais encontrados")
    return textos
