from playwright.async_api import async_playwright
from typing import List


async def fetch_page(url: str, wait_selector: str = "body") -> str:
    """Busca o HTML de uma página usando Playwright."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (compatible; ConcurseiroBot/1.0)"
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_selector(wait_selector, timeout=10000)
            return await page.content()
        except Exception as e:
            print(f"[SCRAPER] Erro ao acessar {url}: {e}")
            return ""
        finally:
            await browser.close()


async def fetch_multiple(urls: List[str]) -> List[str]:
    """Busca múltiplas URLs em paralelo."""
    import asyncio
    results = await asyncio.gather(*[fetch_page(u) for u in urls], return_exceptions=True)
    return [r if isinstance(r, str) else "" for r in results]
