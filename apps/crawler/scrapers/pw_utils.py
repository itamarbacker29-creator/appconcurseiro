"""
Utilitários Playwright compartilhados entre scrapers que precisam de JS rendering.
Usa playwright async API com chromium headless.
"""
from playwright.async_api import async_playwright, Page, Browser


async def get_page_html(url: str, wait_selector: str | None = None, timeout: int = 15000) -> str | None:
    """
    Abre url com Playwright e retorna o HTML após renderização JS.
    wait_selector: CSS selector a aguardar antes de retornar (opcional).
    """
    try:
        async with async_playwright() as pw:
            browser: Browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page: Page = await browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
                extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9"},
            )
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            if wait_selector:
                try:
                    await page.wait_for_selector(wait_selector, timeout=8000)
                except Exception:
                    pass
            html = await page.content()
            await browser.close()
            return html
    except Exception as e:
        print(f"  [PW] Erro ao carregar {url}: {e}")
        return None
