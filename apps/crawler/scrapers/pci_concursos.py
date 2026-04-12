from bs4 import BeautifulSoup
from scrapers.base_scraper import fetch_page
from typing import List


async def scrape_pci() -> List[str]:
    """Scrapa editais do PCI Concursos."""
    print("[PCI] Iniciando scraping...")
    url = "https://www.pciconcursos.com.br/concursos/noticias/"
    html = await fetch_page(url)

    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    textos = []

    # Extrair cards de concurso
    cards = soup.select(".na") or soup.select("article") or soup.select(".noticia")
    for card in cards[:20]:  # Máximo 20 por vez
        texto = card.get_text(separator="\n", strip=True)
        if len(texto) > 100:
            textos.append(texto)

    print(f"[PCI] {len(textos)} editais encontrados")
    return textos
