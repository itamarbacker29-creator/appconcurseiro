"""
Utilitários Playwright compartilhados entre scrapers que precisam de JS rendering.
Usa playwright async API com chromium headless + stealth básico.
"""
from playwright.async_api import async_playwright, Page, Browser

# Esconde indicadores de headless/automação que sites usam para bloquear bots
_STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]});
Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR', 'pt', 'en-US']});
window.chrome = {runtime: {}};
"""


async def get_page_html(url: str, wait_selector: str | None = None, timeout: int = 15000) -> str | None:
    """
    Abre url com Playwright + stealth e retorna o HTML após renderização JS.
    wait_selector: CSS selector a aguardar antes de retornar (opcional).
    """
    try:
        async with async_playwright() as pw:
            browser: Browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="pt-BR",
                extra_http_headers={
                    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )
            await context.add_init_script(_STEALTH_SCRIPT)
            page: Page = await context.new_page()
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
