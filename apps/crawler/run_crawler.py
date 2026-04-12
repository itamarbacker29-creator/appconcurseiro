"""
Crawler standalone — GitHub Actions v3.
RSS feeds inline, sem Playwright, sem imports de scrapers externos.
"""
import asyncio, os, json
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://novosconcursos.com/feed/",
    "https://www.estrategiaconcursos.com.br/feed/",
    "https://www.gran.com.br/blog/feed/",
    "https://www.pciconcursos.com.br/rss/noticias.xml",
]

PROMPT = """Extraia dados deste texto sobre concurso público brasileiro em JSON:
{
  "orgao": "nome do órgão",
  "cargo": "nome do cargo",
  "escolaridade": "fundamental|medio|superior",
  "salario": 0.0,
  "vagas": 0,
  "estado": "XX ou Nacional",
  "area": "tributario|seguranca|saude|educacao|administrativo|judiciario|outros",
  "data_inscricao_inicio": "YYYY-MM-DD ou null",
  "data_inscricao_fim": "YYYY-MM-DD ou null",
  "link_inscricao": "url ou null",
  "banca": "nome ou null",
  "materias": [],
  "status": "ativo"
}
Retorne APENAS o JSON. Se não for sobre concurso público real com órgão e cargo definidos, retorne null.
TEXTO: {texto}"""


async def buscar_rss() -> list[str]:
    textos = []
    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    print(f"[RSS] Buscando em {len(RSS_FEEDS)} feeds...")

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
        for url in RSS_FEEDS:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    print(f"[RSS] {url} → HTTP {resp.status_code}")
                    continue

                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item") or soup.find_all("entry")
                print(f"[RSS] {url} → {len(items)} itens")

                for item in items[:15]:
                    titulo_tag = item.find("title")
                    titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                    desc_tag = item.find("description") or item.find("summary")
                    desc = BeautifulSoup(desc_tag.get_text(), "lxml").get_text("\n", strip=True) if desc_tag else ""
                    link_tag = item.find("link")
                    link = link_tag.get_text(strip=True) if link_tag and link_tag.get_text(strip=True) else (link_tag.get("href", "") if link_tag else "")

                    if len(titulo) > 10:
                        textos.append(f"Título: {titulo}\n{desc[:1500]}\nURL: {link}")

            except Exception as e:
                print(f"[RSS] Erro em {url}: {e}")

    print(f"[RSS] {len(textos)} textos coletados")
    return textos


async def parsear(texto: str) -> dict | None:
    try:
        resp = model.generate_content(PROMPT.replace("{texto}", texto[:2500]))
        raw = resp.text.strip().replace("```json", "").replace("```", "").strip()
        if not raw or raw == "null" or not raw.startswith("{"):
            return None
        return json.loads(raw)
    except Exception as e:
        print(f"  [PARSER] {e}")
        return None


async def main():
    print("[CRAWLER] v3 iniciando — RSS feeds direto, sem Playwright")
    textos = await buscar_rss()

    salvos = 0
    for i, texto in enumerate(textos):
        print(f"[PARSER] Processando {i+1}/{len(textos)}...")
        dados = await parsear(texto)
        if not dados or not dados.get("orgao") or not dados.get("cargo"):
            continue
        if not dados.get("link_inscricao"):
            dados["link_inscricao"] = "https://concursosnobrasil.com.br"
        try:
            r = supabase.table("editais").upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim").execute()
            if r.data:
                salvos += 1
                print(f"  ✓ {dados['orgao']} — {dados['cargo']}")
        except Exception as e:
            print(f"  ✗ {e}")

    print(f"\n[CRAWLER] Concluído: {salvos} editais salvos de {len(textos)} processados.")


if __name__ == "__main__":
    asyncio.run(main())
