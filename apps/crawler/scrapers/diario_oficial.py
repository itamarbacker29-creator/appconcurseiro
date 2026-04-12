import httpx
from bs4 import BeautifulSoup
from typing import List

RSS_SOURCES = [
    "https://www.estrategiaconcursos.com.br/feed/",
    "https://www.gran.com.br/blog/feed/",
    "https://novosconcursos.com/feed/",
]

async def scrape_do() -> List[str]:
    """Scrapa editais via RSS de portais de concursos."""
    print("[DO] Iniciando scraping via RSS...")
    textos = []
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ConcurseiroBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }

    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
        for feed_url in RSS_SOURCES:
            try:
                resp = await client.get(feed_url)
                if resp.status_code != 200:
                    print(f"[DO] HTTP {resp.status_code} — {feed_url}")
                    continue

                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item") or soup.find_all("entry")
                print(f"[DO] {feed_url} → {len(items)} itens")

                for item in items[:15]:
                    titulo = item.find("title")
                    desc = item.find("description") or item.find("summary") or item.find("content")
                    link = item.find("link")

                    # Filtra apenas conteúdo sobre concursos/editais
                    titulo_text = titulo.get_text(strip=True) if titulo else ""
                    if not any(kw in titulo_text.lower() for kw in
                               ["concurso", "edital", "seleção", "vagas", "inscri", "gabarito"]):
                        continue

                    partes = [f"Título: {titulo_text}"]
                    if desc:
                        desc_text = BeautifulSoup(desc.get_text(), "lxml").get_text("\n", strip=True)
                        partes.append(desc_text[:2000])
                    if link:
                        url = link.get_text(strip=True) or link.get("href", "")
                        if url:
                            partes.append(f"link_inscricao: {url}")

                    texto = "\n".join(partes)
                    if len(texto) > 50:
                        textos.append(texto)

            except Exception as e:
                print(f"[DO] Erro em {feed_url}: {e}")

    print(f"[DO] {len(textos)} editais encontrados no total")
    return textos[:20]
