import httpx
from bs4 import BeautifulSoup
from typing import List

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://www.pciconcursos.com.br/rss/noticias.xml",
    "https://www.qconcursos.com/feed/noticias",
]

async def scrape_pci() -> List[str]:
    """Scrapa editais via RSS feeds de concursos."""
    print("[PCI] Iniciando scraping via RSS...")
    textos = []
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ConcurseiroBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }

    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
        for feed_url in RSS_FEEDS:
            try:
                resp = await client.get(feed_url)
                if resp.status_code != 200:
                    print(f"[PCI] HTTP {resp.status_code} — {feed_url}")
                    continue

                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item") or soup.find_all("entry")
                print(f"[PCI] {feed_url} → {len(items)} itens")

                for item in items[:20]:
                    titulo = item.find("title")
                    desc = item.find("description") or item.find("summary") or item.find("content")
                    link = item.find("link")

                    partes = []
                    if titulo:
                        partes.append(f"Título: {titulo.get_text(strip=True)}")
                    if desc:
                        desc_text = BeautifulSoup(desc.get_text(), "lxml").get_text("\n", strip=True)
                        partes.append(desc_text)
                    if link:
                        url = link.get_text(strip=True) or link.get("href", "")
                        if url:
                            partes.append(f"link_inscricao: {url}")

                    texto = "\n".join(partes)
                    if len(texto) > 50:
                        textos.append(texto)

            except Exception as e:
                print(f"[PCI] Erro em {feed_url}: {e}")

    print(f"[PCI] {len(textos)} editais encontrados no total")
    return textos[:30]
