"""
Crawler v5 — RSS + Gemini Flash em batch.
1 chamada ao Gemini por execução (zero quota problem).
"""
import asyncio, json, os, re
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://www.estrategiaconcursos.com.br/feed/",
    "https://www.gran.com.br/blog/feed/",
    "https://www.pciconcursos.com.br/rss/noticias.xml",
]

PROMPT_SISTEMA = """
Você é um assistente especializado em concursos públicos brasileiros.
Receberá uma lista de itens de RSS feeds de portais de concursos.
Sua tarefa: identificar APENAS os itens que anunciam um NOVO edital de concurso público ou processo seletivo aberto para inscrições.

IGNORAR obrigatoriamente:
- Notícias sobre INSS, aposentadoria, BPC, benefícios sociais
- Resultados de provas, gabaritos
- Apostilas, cursos, dicas de estudo
- Artigos gerais (curiosidades, plantas, animais, etc.)
- Concursos já encerrados

Para cada edital válido identificado, retorne um JSON com:
{
  "orgao": "nome do órgão",
  "cargo": "cargo(s) ofertado(s)",
  "escolaridade": "medio" ou "superior",
  "salario": número float ou null,
  "vagas": número inteiro ou null,
  "estado": "sigla UF" ou "Nacional",
  "area": "tributario" | "seguranca" | "saude" | "educacao" | "judiciario" | "administrativo",
  "data_inscricao_inicio": "YYYY-MM-DD" ou null,
  "data_inscricao_fim": "YYYY-MM-DD" ou null,
  "link_inscricao": "URL completa do edital",
  "banca": "nome da banca" ou null
}

Retorne SOMENTE um array JSON válido, sem markdown, sem explicações. Se não houver editais válidos, retorne [].
"""


async def coletar_itens_rss() -> list[dict]:
    """Coleta todos os itens dos feeds RSS."""
    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    itens = []

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

                for item in items[:20]:
                    titulo_tag = item.find("title")
                    titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                    desc_tag = item.find("description") or item.find("summary")
                    desc = BeautifulSoup(desc_tag.get_text(), "lxml").get_text(" ", strip=True)[:500] if desc_tag else ""
                    link_tag = item.find("link")
                    link = (link_tag.get_text(strip=True) if link_tag and link_tag.get_text(strip=True) else link_tag.get("href", "") if link_tag else "")

                    if titulo:
                        itens.append({"titulo": titulo, "desc": desc, "link": link})

            except Exception as e:
                print(f"[RSS] Erro em {url}: {e}")

    return itens


def classificar_com_gemini(itens: list[dict]) -> list[dict]:
    """Envia todos os itens em uma única chamada ao Gemini para classificação."""
    if not itens:
        return []

    # Monta o texto com todos os itens numerados
    texto_itens = ""
    for i, item in enumerate(itens):
        texto_itens += f"\n[{i+1}] Título: {item['titulo']}\nDescrição: {item['desc']}\nLink: {item['link']}\n"

    prompt = f"{PROMPT_SISTEMA}\n\nITENS PARA ANALISAR:\n{texto_itens}"

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        texto = response.text.strip()

        # Remove markdown se presente
        texto = re.sub(r'^```(?:json)?\s*', '', texto)
        texto = re.sub(r'\s*```$', '', texto)

        editais = json.loads(texto)
        print(f"[GEMINI] {len(editais)} editais válidos identificados de {len(itens)} itens")
        return editais if isinstance(editais, list) else []

    except json.JSONDecodeError as e:
        print(f"[GEMINI] Erro ao parsear JSON: {e}")
        print(f"[GEMINI] Resposta: {texto[:300]}")
        return []
    except Exception as e:
        print(f"[GEMINI] Erro: {e}")
        return []


def normalizar_edital(edital: dict) -> dict:
    """Garante que o edital tem todos os campos necessários com tipos corretos."""
    return {
        "orgao": str(edital.get("orgao") or "")[:100],
        "cargo": str(edital.get("cargo") or "")[:150],
        "escolaridade": edital.get("escolaridade") or "medio",
        "salario": float(edital["salario"]) if edital.get("salario") else None,
        "vagas": int(edital["vagas"]) if edital.get("vagas") else None,
        "estado": str(edital.get("estado") or "Nacional")[:10],
        "area": edital.get("area") or "administrativo",
        "data_inscricao_inicio": edital.get("data_inscricao_inicio") or None,
        "data_inscricao_fim": edital.get("data_inscricao_fim") or None,
        "link_inscricao": str(edital.get("link_inscricao") or "https://concursosnobrasil.com.br"),
        "banca": str(edital["banca"])[:100] if edital.get("banca") else None,
        "materias": [],
        "status": "ativo",
    }


async def buscar_e_salvar():
    print("[CRAWLER] v5 — RSS + Gemini Flash (batch único)")

    # 1. Coleta todos os itens dos feeds
    itens = await coletar_itens_rss()
    print(f"[CRAWLER] Total de itens coletados: {len(itens)}")

    if not itens:
        print("[CRAWLER] Nenhum item coletado. Encerrando.")
        return

    # 2. Classifica tudo com uma única chamada ao Gemini
    editais_brutos = classificar_com_gemini(itens)

    if not editais_brutos:
        print("[CRAWLER] Gemini não identificou editais válidos.")
        return

    # 3. Salva no Supabase
    salvos = 0
    for edital in editais_brutos:
        dados = normalizar_edital(edital)
        if not dados["orgao"] or not dados["cargo"]:
            continue
        try:
            r = supabase.table("editais").upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim").execute()
            if r.data:
                salvos += 1
                print(f"  ✓ {dados['orgao']} — {dados['cargo']}")
        except Exception as e:
            print(f"  ✗ {e}")

    print(f"\n[CRAWLER] Concluído: {salvos}/{len(editais_brutos)} editais salvos.")


if __name__ == "__main__":
    asyncio.run(buscar_e_salvar())
