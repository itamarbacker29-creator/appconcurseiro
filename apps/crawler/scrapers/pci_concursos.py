import httpx
from bs4 import BeautifulSoup
from typing import List


async def scrape_pci() -> List[str]:
    """Scrapa editais do PCI Concursos via httpx."""
    print("[PCI] Iniciando scraping...")
    urls = [
        "https://www.pciconcursos.com.br/concursos/nacionais/",
        "https://www.pciconcursos.com.br/concursos/",
    ]

    textos = []
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }

    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        for url in urls:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"[PCI] HTTP {resp.status_code} em {url}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")

                # Tenta vários seletores conhecidos do PCI
                cards = (
                    soup.select(".ca") or
                    soup.select(".concurso") or
                    soup.select("article.concurso") or
                    soup.select(".listagem-concursos li") or
                    soup.select("table.concursos tr") or
                    soup.select(".noticias-lista article") or
                    soup.select("div[class*='concurso']")
                )

                if not cards:
                    # Fallback: extrai todos os links com texto relevante
                    links = soup.find_all("a", href=True)
                    for link in links:
                        texto = link.get_text(strip=True)
                        if len(texto) > 30 and any(
                            kw in texto.lower()
                            for kw in ["concurso", "edital", "seleção", "vagas", "inscri"]
                        ):
                            parent = link.find_parent(["li", "div", "article", "tr"])
                            if parent:
                                bloco = parent.get_text(separator="\n", strip=True)
                                if len(bloco) > 50 and bloco not in textos:
                                    textos.append(bloco)

                for card in cards[:25]:
                    texto = card.get_text(separator="\n", strip=True)
                    if len(texto) > 50:
                        textos.append(texto)

            except Exception as e:
                print(f"[PCI] Erro em {url}: {e}")

    print(f"[PCI] {len(textos)} blocos encontrados")
    return textos[:30]
