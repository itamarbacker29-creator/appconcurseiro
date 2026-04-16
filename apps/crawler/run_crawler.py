"""
Crawler v7 — RSS + Gemini 1.5 Flash em batch único.
Extrai dados completos do edital para o candidato.
Filtra editais com inscrições encerradas antes de salvar.
Usa gemini-1.5-flash (cota separada de gemini-2.0-flash).
"""
import asyncio, json, os, re, time
from datetime import date
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
    "https://blog.grancursosonline.com.br/feed/",
    "https://www.tecconcursos.com.br/blog/feed/",
    "https://www.qconcursos.com/noticias/feed/",
    "https://www.estrategiaconcursos.com.br/blog/feed/",
]

HOJE = date.today().isoformat()  # YYYY-MM-DD

PROMPT_SISTEMA = f"""
Você é um especialista em concursos públicos brasileiros.
Receberá itens de RSS feeds de portais como concursosnobrasil.com.br, estrategiaconcursos.com.br, gran.com.br e pciconcursos.com.br.

HOJE É: {HOJE}

SUA TAREFA: Identificar APENAS itens que anunciam um concurso público, processo seletivo simplificado ou seleção pública com INSCRIÇÕES ABERTAS OU A ABRIR — ou seja, com data de encerramento das inscrições IGUAL OU POSTERIOR A HOJE.

INCLUIR obrigatoriamente (exemplos de conteúdo válido):
- Concurso INSS 2025: vagas para Técnico e Analista (INSS FAZ concursos — inclua!)
- Concurso Prefeitura de São Paulo — vagas para professor
- Edital Polícia Civil SP — inscrições abertas
- Processo seletivo Correios 2025
- Concurso Banco do Brasil — analista
- Edital TRF, TRT, TJ, MPF, PF, PRF, ANAC, ANVISA etc.

IGNORAR obrigatoriamente (conteúdo inválido):
- Notícias sobre BENEFÍCIOS do INSS (BPC, aposentadoria, 13º salário, calendário de pagamentos)
- Notícias sobre IRPF, declaração de imposto de renda
- Gabaritos ou resultados de provas já realizadas
- Apostilas, cursos preparatórios, dicas de estudo, como passar
- Artigos de entretenimento (raças de animais, plantas, curiosidades, sobrenomes)
- Editais com inscrições JÁ ENCERRADAS (data_inscricao_fim anterior a {HOJE})
- Concursos sem data definida e sem informação de inscrições abertas

Para cada edital válido, retorne um objeto JSON com TODOS os campos abaixo (use null quando não disponível):

{{
  "orgao": "nome completo do órgão/entidade contratante (ex: INSS, Prefeitura de Curitiba, TRF 4ª Região)",
  "cargo": "cargo(s) ofertado(s) — se múltiplos, liste separados por vírgula",
  "escolaridade": "fundamental" | "medio" | "superior",
  "nivel": "federal" | "estadual" | "municipal",
  "cidade": "nome da cidade ou null se for estadual/federal/nacional",
  "estado": "sigla UF de 2 letras (ex: SP, RJ, MG) ou 'Nacional' para concursos federais sem sede fixa",
  "area": "tributario" | "seguranca" | "saude" | "educacao" | "judiciario" | "tecnologia" | "administrativo",
  "vagas": número inteiro total de vagas ou null,
  "salario": valor numérico do salário base em reais (float) ou null,
  "banca": "nome da banca organizadora (ex: CESPE, FGV, VUNESP, FCC, IBFC) ou null",
  "data_inscricao_inicio": "YYYY-MM-DD" ou null,
  "data_inscricao_fim": "YYYY-MM-DD" ou null,
  "link_inscricao": "URL completa para inscrição ou edital",
  "link_edital_pdf": "URL direta para o PDF do edital ou null"
}}

Retorne SOMENTE um array JSON válido com os editais encontrados. Sem markdown, sem explicações. Se nenhum item for válido, retorne [].
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

                for item in items[:25]:
                    titulo_tag = item.find("title")
                    titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                    if not titulo:
                        continue

                    desc_tag = item.find("description") or item.find("summary") or item.find("content")
                    desc = ""
                    if desc_tag:
                        desc = BeautifulSoup(desc_tag.get_text(), "lxml").get_text(" ", strip=True)[:600]

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
    """Envia todos os itens em UMA única chamada ao Gemini, com retry em caso de quota."""
    if not itens:
        return []

    texto_itens = ""
    for i, item in enumerate(itens, 1):
        texto_itens += f"\n[{i}]\nTítulo: {item['titulo']}\nDescrição: {item['desc']}\nLink: {item['link']}\n"

    prompt = f"{PROMPT_SISTEMA}\n\nITENS:\n{texto_itens}"

    # gemini-1.5-flash tem cota separada de gemini-2.0-flash — usar 1.5 no crawler
    modelos = ["gemini-1.5-flash", "gemini-1.5-flash-latest"]
    texto = ""

    for modelo in modelos:
        for tentativa in range(3):
            try:
                print(f"[GEMINI] Tentativa {tentativa+1}/3 com {modelo}...")
                model = genai.GenerativeModel(modelo)
                response = model.generate_content(prompt)
                texto = response.text.strip()

                # Remove bloco markdown se presente
                texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
                texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
                texto = texto.strip()

                editais = json.loads(texto)
                if not isinstance(editais, list):
                    print(f"[GEMINI] Resposta inesperada (não é lista)")
                    return []

                print(f"[GEMINI] {len(editais)} editais válidos identificados de {len(itens)} itens (modelo: {modelo})")
                return editais

            except json.JSONDecodeError as e:
                print(f"[GEMINI] Erro JSON: {e}")
                if texto:
                    print(f"[GEMINI] Trecho: {texto[:400]}")
                return []
            except Exception as e:
                msg = str(e)
                if "429" in msg or "quota" in msg.lower():
                    espera = 30 * (tentativa + 1)
                    print(f"[GEMINI] Quota excedida ({modelo}). Aguardando {espera}s...")
                    time.sleep(espera)
                    continue
                print(f"[GEMINI] Erro com {modelo}: {e}")
                break  # erro não-quota → tenta próximo modelo

    print("[GEMINI] Todos os modelos falharam.")
    return []


def edital_encerrado(edital: dict) -> bool:
    """Retorna True se o prazo de inscrição já passou."""
    fim = edital.get("data_inscricao_fim")
    if not fim:
        return False  # sem data = mantém (pode ser 'a abrir')
    try:
        return fim < HOJE
    except Exception:
        return False


def normalizar(edital: dict) -> dict | None:
    """Valida e normaliza os campos. Retorna None se dados mínimos faltarem."""
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
    print(f"[CRAWLER] v8 — RSS + Gemini 2.0 Flash (batch único) | hoje={HOJE}")

    itens = await coletar_itens_rss()
    if not itens:
        print("[CRAWLER] Nenhum item coletado. Encerrando.")
        return

    editais_brutos = classificar_com_gemini(itens)
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
