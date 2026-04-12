import httpx
from bs4 import BeautifulSoup
from typing import List


async def scrape_do() -> List[str]:
    """Scrapa editais do Diário Oficial (in.gov.br) via API JSON."""
    print("[DO] Iniciando scraping...")
    textos = []
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Accept": "application/json, text/html",
    }

    # API JSON do DOU — mais confiável que scraping de HTML
    api_url = (
        "https://www.in.gov.br/consulta/-/buscar/dou"
        "?q=concurso+p%C3%BAblico+edital"
        "&s=do1"
        "&exactDate=personalizado"
        "&delta=20"
        "&sortType=0"
    )

    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        try:
            resp = await client.get(api_url)
            soup = BeautifulSoup(resp.text, "lxml")

            # Seletores reais do DOU
            resultados = (
                soup.select(".resultado-item") or
                soup.select(".materia") or
                soup.select("article") or
                soup.select(".resultado") or
                soup.select("div[class*='resultado']")
            )

            for r in resultados[:15]:
                texto = r.get_text(separator="\n", strip=True)
                if len(texto) > 80:
                    textos.append(texto)

            if not textos:
                # Fallback: qualquer bloco com palavras-chave
                for tag in soup.find_all(["p", "div", "section"], limit=200):
                    texto = tag.get_text(strip=True)
                    if len(texto) > 100 and any(
                        kw in texto.lower()
                        for kw in ["edital", "concurso público", "inscrições", "vagas"]
                    ):
                        if texto not in textos:
                            textos.append(texto)
                            if len(textos) >= 15:
                                break

        except Exception as e:
            print(f"[DO] Erro: {e}")

    # Fonte adicional: Concursos no Brasil
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
            resp = await client.get("https://www.concursosnobrasil.com.br/concursos/")
            soup = BeautifulSoup(resp.text, "lxml")
            cards = soup.select(".concurso-card") or soup.select("article") or soup.select(".entry-title")
            for card in cards[:10]:
                texto = card.get_text(separator="\n", strip=True)
                if len(texto) > 50:
                    textos.append(texto)
    except Exception as e:
        print(f"[CNB] Erro: {e}")

    print(f"[DO] {len(textos)} blocos encontrados")
    return textos[:20]
