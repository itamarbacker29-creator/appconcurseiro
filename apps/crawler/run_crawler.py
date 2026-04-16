"""
Crawler v9 — RSS + Gemini 2.0 Flash (google-genai SDK) em batch único.
Pré-filtra itens por palavras-chave antes de chamar a IA (reduz tokens ~70%).
Filtra editais com inscrições encerradas antes de salvar.
"""
import asyncio, json, os, re, time
from datetime import date
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client
from google import genai

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://blog.grancursosonline.com.br/feed/",
    "https://www.tecconcursos.com.br/blog/feed/",
    "https://www.qconcursos.com/noticias/feed/",
    "https://www.estrategiaconcursos.com.br/blog/feed/",
]

# Palavras-chave que indicam edital/concurso real (pré-filtro antes do Gemini)
PALAVRAS_EDITAL = [
    "concurso", "edital", "vagas", "inscrições", "processo seletivo",
    "seleção pública", "certame", "prova", "gabarito provisório",
]
# Palavras que descartam imediatamente o item
PALAVRAS_LIXO = [
    "aposentadoria", "benefício", "bpc", "irpf", "imposto de renda",
    "calendário", "13º", "como passar", "apostila", "dica de estudo",
    "raça de", "planta", "curiosidade",
]

HOJE = date.today().isoformat()  # YYYY-MM-DD

PROMPT_SISTEMA = f"""Você é um especialista em concursos públicos brasileiros.
Receberá títulos e descrições de notícias pré-filtradas de portais de concursos.

HOJE É: {HOJE}

TAREFA: Para cada item que anuncia um concurso/edital com inscrições ABERTAS ou A ABRIR
(data_inscricao_fim >= {HOJE} ou sem data definida), extraia os dados abaixo.
Descarte itens que sejam apenas dicas de estudo, gabaritos finais, resultados ou apostilas.

Retorne APENAS um array JSON. Cada edital válido deve ter:
{{
  "orgao": "nome do órgão (ex: INSS, Prefeitura de SP, TRF 4ª)",
  "cargo": "cargo(s) — se múltiplos, separe por vírgula",
  "escolaridade": "fundamental" | "medio" | "superior",
  "nivel": "federal" | "estadual" | "municipal",
  "cidade": "cidade ou null",
  "estado": "sigla UF ou 'Nacional'",
  "area": "tributario"|"seguranca"|"saude"|"educacao"|"judiciario"|"tecnologia"|"administrativo",
  "vagas": número inteiro ou null,
  "salario": número float ou null,
  "banca": "nome da banca ou null",
  "data_inscricao_inicio": "YYYY-MM-DD" ou null,
  "data_inscricao_fim": "YYYY-MM-DD" ou null,
  "link_inscricao": "URL completa",
  "link_edital_pdf": "URL do PDF ou null"
}}

Se nenhum item for válido, retorne []. Sem markdown, sem texto fora do JSON."""


def pre_filtrar(itens: list[dict]) -> list[dict]:
    """Descarta itens claramente irrelevantes por palavras-chave no título."""
    resultado = []
    for item in itens:
        titulo_lower = item["titulo"].lower()
        if any(p in titulo_lower for p in PALAVRAS_LIXO):
            continue
        if any(p in titulo_lower for p in PALAVRAS_EDITAL):
            resultado.append(item)
    print(f"[PRÉ-FILTRO] {len(resultado)}/{len(itens)} itens passaram pelo filtro de palavras-chave")
    return resultado


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

                for item in items[:25]:
                    titulo_tag = item.find("title")
                    titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                    if not titulo:
                        continue

                    desc_tag = item.find("description") or item.find("summary") or item.find("content")
                    desc = ""
                    if desc_tag:
                        desc = BeautifulSoup(desc_tag.get_text(), "lxml").get_text(" ", strip=True)[:400]

                    link_tag = item.find("link")
                    link = ""
                    if link_tag:
                        link = link_tag.get_text(strip=True) or link_tag.get("href", "")

                    itens.append({"titulo": titulo, "desc": desc, "link": link})

            except Exception as e:
                print(f"[RSS] Erro em {url}: {e}")

    # Remove duplicatas por título
    vistos = set()
    unicos = []
    for item in itens:
        if item["titulo"] not in vistos:
            vistos.add(item["titulo"])
            unicos.append(item)

    print(f"[RSS] Total: {len(unicos)} itens únicos coletados")
    return unicos


def classificar_com_gemini(itens: list[dict]) -> list[dict]:
    """Envia itens pré-filtrados ao Gemini 2.0 Flash, com retry em quota."""
    if not itens:
        return []

    texto_itens = ""
    for i, item in enumerate(itens, 1):
        texto_itens += f"\n[{i}] {item['titulo']}\n{item['desc']}\nLink: {item['link']}\n"

    prompt = f"{PROMPT_SISTEMA}\n\nITENS:\n{texto_itens}"

    modelos = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]
    texto = ""

    for modelo in modelos:
        for tentativa in range(3):
            try:
                print(f"[GEMINI] Tentativa {tentativa+1}/3 com {modelo} ({len(itens)} itens)...")
                response = gemini.models.generate_content(model=modelo, contents=prompt)
                texto = response.text.strip()

                texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
                texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
                texto = texto.strip()

                editais = json.loads(texto)
                if not isinstance(editais, list):
                    print("[GEMINI] Resposta inesperada (não é lista)")
                    return []

                print(f"[GEMINI] {len(editais)} editais válidos (modelo: {modelo})")
                return editais

            except json.JSONDecodeError as e:
                print(f"[GEMINI] Erro JSON: {e}")
                if texto:
                    print(f"[GEMINI] Trecho: {texto[:400]}")
                return []
            except Exception as e:
                msg = str(e)
                if "429" in msg or "quota" in msg.lower() or "RESOURCE_EXHAUSTED" in msg:
                    espera = 30 * (tentativa + 1)
                    print(f"[GEMINI] Quota excedida ({modelo}). Aguardando {espera}s...")
                    time.sleep(espera)
                    continue
                print(f"[GEMINI] Erro com {modelo}: {e}")
                break  # erro não-quota → tenta próximo modelo

    print("[GEMINI] Todos os modelos falharam.")
    return []


def edital_encerrado(edital: dict) -> bool:
    fim = edital.get("data_inscricao_fim")
    if not fim:
        return False
    try:
        return fim < HOJE
    except Exception:
        return False


def normalizar(edital: dict) -> dict | None:
    orgao = str(edital.get("orgao") or "").strip()[:100]
    cargo = str(edital.get("cargo") or "").strip()[:200]
    link  = str(edital.get("link_inscricao") or "").strip()

    if not orgao or not cargo:
        return None
    if not link:
        link = "https://concursosnobrasil.com.br"

    def parse_float(v):
        try: return float(v)
        except: return None

    def parse_int(v):
        try: return int(v)
        except: return None

    escolaridade = edital.get("escolaridade") or "medio"
    if escolaridade not in ("fundamental", "medio", "superior"):
        escolaridade = "medio"

    nivel = edital.get("nivel") or "federal"
    if nivel not in ("federal", "estadual", "municipal"):
        nivel = "federal"

    area = edital.get("area") or "administrativo"
    if area not in ("tributario","seguranca","saude","educacao","judiciario","tecnologia","administrativo"):
        area = "administrativo"

    return {
        "orgao":                orgao,
        "cargo":                cargo,
        "escolaridade":         escolaridade,
        "nivel":                nivel,
        "cidade":               str(edital["cidade"]).strip()[:100] if edital.get("cidade") else None,
        "estado":               str(edital.get("estado") or "Nacional").strip()[:10],
        "area":                 area,
        "vagas":                parse_int(edital.get("vagas")),
        "salario":              parse_float(edital.get("salario")),
        "banca":                str(edital["banca"]).strip()[:100] if edital.get("banca") else None,
        "data_inscricao_inicio": edital.get("data_inscricao_inicio") or None,
        "data_inscricao_fim":   edital.get("data_inscricao_fim") or None,
        "link_inscricao":       link,
        "link_edital_pdf":      str(edital["link_edital_pdf"]).strip() if edital.get("link_edital_pdf") else None,
        "materias":             [],
        "status":               "ativo",
    }


async def buscar_e_salvar():
    print(f"[CRAWLER] v9 — RSS + Gemini 2.0 Flash (google-genai SDK) | hoje={HOJE}")

    itens = await coletar_itens_rss()
    if not itens:
        print("[CRAWLER] Nenhum item coletado. Encerrando.")
        return

    itens_filtrados = pre_filtrar(itens)
    if not itens_filtrados:
        print("[CRAWLER] Nenhum item passou pelo pré-filtro.")
        return

    editais_brutos = classificar_com_gemini(itens_filtrados)
    if not editais_brutos:
        print("[CRAWLER] Gemini não identificou editais válidos.")
        return

    salvos = ignorados = erros = 0
    for edital in editais_brutos:
        if edital_encerrado(edital):
            print(f"  ⏭  Encerrado: {edital.get('orgao')} — {edital.get('data_inscricao_fim')}")
            ignorados += 1
            continue

        dados = normalizar(edital)
        if not dados:
            ignorados += 1
            continue

        try:
            r = supabase.table("editais").upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim").execute()
            if r.data:
                salvos += 1
                vagas_str = f"{dados['vagas']} vagas" if dados['vagas'] else "vagas n/d"
                local = f"{dados['cidade']}/{dados['estado']}" if dados['cidade'] else dados['estado']
                print(f"  ✓ [{dados['nivel']}] {dados['orgao']} — {dados['cargo']} | {vagas_str} | {local}")
        except Exception as e:
            print(f"  ✗ {e}")
            erros += 1

    print(f"\n[CRAWLER] Concluído: {salvos} salvos | {ignorados} ignorados | {erros} erros")


if __name__ == "__main__":
    asyncio.run(buscar_e_salvar())
