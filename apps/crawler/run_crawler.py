"""
Crawler v11 — RSS + Claude Haiku + extração de PDF via Gemini Flash.

Fluxo:
  1. Coleta itens de feeds RSS de portais de concursos
  2. Pré-filtra por palavras-chave (sem chamar IA)
  3. Claude Haiku classifica e extrai campos estruturados
  4. Upsert no Supabase
  5. (Novo) Para editais recentes sem matérias: busca PDF → sobe Storage → Gemini extrai matérias
"""
import asyncio, json, os, re, time
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client
import anthropic

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
claude   = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://blog.grancursosonline.com.br/feed/",
    "https://www.tecconcursos.com.br/blog/feed/",
    "https://www.qconcursos.com/noticias/feed/",
    "https://www.estrategiaconcursos.com.br/blog/feed/",
]

PALAVRAS_EDITAL = [
    "concurso", "edital", "vagas", "inscrições", "processo seletivo",
    "seleção pública", "certame", "prova", "gabarito provisório",
]
PALAVRAS_LIXO = [
    "aposentadoria", "benefício", "bpc", "irpf", "imposto de renda",
    "calendário", "13º", "como passar", "apostila", "dica de estudo",
    "raça de", "planta", "curiosidade",
]

HOJE = date.today().isoformat()
MAX_PDFS_POR_EXECUCAO = 10
MAX_PDF_BYTES = 3_000_000   # 3 MB — suficiente para extrair matérias

SYSTEM_PROMPT = f"""Você é um especialista em concursos públicos brasileiros.
Receberá títulos e descrições de notícias de portais de concursos.
HOJE É: {HOJE}

Para cada item que anuncia um concurso/edital com inscrições ABERTAS ou A ABRIR
(data_inscricao_fim >= {HOJE} ou sem data), extraia os campos abaixo.
Descarte dicas de estudo, gabaritos finais, resultados e apostilas.

Retorne APENAS um array JSON válido, sem markdown. Cada edital:
{{
  "orgao": "nome do órgão",
  "cargo": "cargo(s)",
  "escolaridade": "fundamental"|"medio"|"superior",
  "nivel": "federal"|"estadual"|"municipal",
  "cidade": "cidade ou null",
  "estado": "sigla UF ou Nacional",
  "area": "tributario"|"seguranca"|"saude"|"educacao"|"judiciario"|"tecnologia"|"administrativo",
  "vagas": número inteiro ou null,
  "salario": número float ou null,
  "banca": "nome da banca ou null",
  "data_inscricao_inicio": "YYYY-MM-DD" ou null,
  "data_inscricao_fim": "YYYY-MM-DD" ou null,
  "link_inscricao": "URL completa ou null",
  "link_edital_pdf": "URL do PDF do edital oficial ou null"
}}

Se nenhum item for válido, retorne []."""


# ─────────────────────────────────────────────
# ETAPA 1 — COLETA RSS
# ─────────────────────────────────────────────

def pre_filtrar(itens: list[dict]) -> list[dict]:
    resultado = []
    for item in itens:
        t = item["titulo"].lower()
        if any(p in t for p in PALAVRAS_LIXO):
            continue
        if any(p in t for p in PALAVRAS_EDITAL):
            resultado.append(item)
    print(f"[PRÉ-FILTRO] {len(resultado)}/{len(itens)} itens relevantes")
    return resultado


async def coletar_itens_rss() -> list[dict]:
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
                    link = link_tag.get_text(strip=True) if link_tag else ""
                    if not link and link_tag:
                        link = link_tag.get("href", "")

                    itens.append({"titulo": titulo, "desc": desc, "link": link})

            except Exception as e:
                print(f"[RSS] Erro em {url}: {e}")

    vistos: set[str] = set()
    unicos = []
    for item in itens:
        if item["titulo"] not in vistos:
            vistos.add(item["titulo"])
            unicos.append(item)

    print(f"[RSS] Total: {len(unicos)} itens únicos coletados")
    return unicos


# ─────────────────────────────────────────────
# ETAPA 2 — CLASSIFICAÇÃO COM CLAUDE
# ─────────────────────────────────────────────

def classificar_com_claude(itens: list[dict]) -> list[dict]:
    if not itens:
        return []

    texto_itens = ""
    for i, item in enumerate(itens, 1):
        texto_itens += f"\n[{i}] {item['titulo']}\n{item['desc']}\nLink: {item['link']}\n"

    for tentativa in range(3):
        try:
            print(f"[CLAUDE] Tentativa {tentativa+1}/3 ({len(itens)} itens)...")
            response = claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": f"ITENS:\n{texto_itens}"}],
            )
            texto = response.content[0].text.strip()
            texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
            texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
            texto = texto.strip()

            editais = json.loads(texto)
            if not isinstance(editais, list):
                print("[CLAUDE] Resposta inesperada (não é lista)")
                return []

            print(f"[CLAUDE] {len(editais)} editais válidos identificados")
            return editais

        except json.JSONDecodeError as e:
            print(f"[CLAUDE] Erro JSON: {e}")
            return []
        except anthropic.RateLimitError:
            espera = 30 * (tentativa + 1)
            print(f"[CLAUDE] Rate limit. Aguardando {espera}s...")
            time.sleep(espera)
        except Exception as e:
            print(f"[CLAUDE] Erro: {e}")
            return []

    print("[CLAUDE] Todas as tentativas falharam.")
    return []


# ─────────────────────────────────────────────
# ETAPA 3 — NORMALIZAR E SALVAR
# ─────────────────────────────────────────────

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
    if not orgao or not cargo:
        return None

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

    link_inscricao = str(edital.get("link_inscricao") or "").strip() or None
    link_pdf = str(edital.get("link_edital_pdf") or "").strip() or None
    # Rejeitar PDFs que claramente não são do edital oficial
    if link_pdf and not link_pdf.lower().endswith(".pdf") and "edital" not in link_pdf.lower():
        link_pdf = None

    return {
        "orgao":                 orgao,
        "cargo":                 cargo,
        "escolaridade":          escolaridade,
        "nivel":                 nivel,
        "cidade":                str(edital["cidade"]).strip()[:100] if edital.get("cidade") else None,
        "estado":                str(edital.get("estado") or "Nacional").strip()[:10],
        "area":                  area,
        "vagas":                 parse_int(edital.get("vagas")),
        "salario":               parse_float(edital.get("salario")),
        "banca":                 str(edital["banca"]).strip()[:100] if edital.get("banca") else None,
        "data_inscricao_inicio": edital.get("data_inscricao_inicio") or None,
        "data_inscricao_fim":    edital.get("data_inscricao_fim") or None,
        "link_inscricao":        link_inscricao,
        "link_edital_pdf":       link_pdf,
        "materias":              [],
        "status":                "ativo",
        "pdf_processado":        False,
    }


# ─────────────────────────────────────────────
# ETAPA 4 — PIPELINE DE PDF (novo)
# ─────────────────────────────────────────────

async def encontrar_link_pdf(url: str) -> str | None:
    """Raspa uma página procurando link para PDF de edital."""
    if not url:
        return None
    # Se a própria URL já é um PDF
    if url.lower().endswith(".pdf"):
        return url

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True,
                                     headers={"User-Agent": "ConcurseiroBot/1.0"}) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            soup = BeautifulSoup(resp.text, "lxml")

        candidatos = []
        for a in soup.find_all("a", href=True):
            href = str(a["href"]).strip()
            if not href:
                continue
            href_abs = href if href.startswith("http") else urljoin(url, href)
            href_lower = href_abs.lower()
            if ".pdf" not in href_lower:
                continue
            # Prioriza links com "edital" no nome
            score = 2 if "edital" in href_lower else 1
            candidatos.append((score, href_abs))

        if candidatos:
            candidatos.sort(reverse=True)
            return candidatos[0][1]

    except Exception as e:
        print(f"  [PDF-FIND] Erro ao raspar {url}: {e}")

    return None


async def baixar_pdf(url: str) -> bytes | None:
    """Baixa PDF e retorna bytes (limitado a MAX_PDF_BYTES)."""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True,
                                     headers={"User-Agent": "ConcurseiroBot/1.0"}) as client:
            async with client.stream("GET", url) as resp:
                if resp.status_code != 200:
                    return None
                content_type = resp.headers.get("content-type", "")
                if "pdf" not in content_type and not url.lower().endswith(".pdf"):
                    return None
                chunks = []
                total = 0
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    chunks.append(chunk)
                    total += len(chunk)
                    if total >= MAX_PDF_BYTES:
                        break
                return b"".join(chunks)
    except Exception as e:
        print(f"  [PDF-DL] Erro ao baixar {url}: {e}")
        return None


def upload_pdf_storage(edital_id: str, pdf_bytes: bytes) -> str | None:
    """Sobe PDF para Supabase Storage e retorna URL pública."""
    try:
        bucket = "editais-pdfs"
        try:
            supabase.storage.create_bucket(bucket, options={"public": True})
        except Exception:
            pass  # bucket já existe

        path = f"{edital_id}.pdf"
        # Remove se já existir (upsert)
        try:
            supabase.storage.from_(bucket).remove([path])
        except Exception:
            pass

        supabase.storage.from_(bucket).upload(
            path=path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )
        return supabase.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        print(f"  [STORAGE] Erro: {e}")
        return None


def extrair_materias_gemini(pdf_bytes: bytes) -> list[str]:
    """Usa Gemini Flash para extrair matérias do conteúdo do PDF."""
    if not GEMINI_API_KEY:
        print("  [GEMINI] GEMINI_API_KEY não configurada — pulando extração de matérias")
        return []
    try:
        from google import genai as google_genai
        from google.genai import types as gtypes

        client = google_genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                gtypes.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                (
                    "Liste todas as matérias e disciplinas cobradas neste edital de concurso público. "
                    "Retorne APENAS um array JSON de strings, sem markdown. "
                    'Exemplo: ["Português", "Direito Constitucional", "Raciocínio Lógico"]. '
                    "Se não encontrar conteúdo programático, retorne []."
                ),
            ],
        )
        texto = response.text.strip()
        texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
        texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
        materias = json.loads(texto.strip())
        if isinstance(materias, list):
            return [str(m).strip() for m in materias if m][:40]  # máximo 40 matérias
    except Exception as e:
        print(f"  [GEMINI] Erro na extração de matérias: {e}")
    return []


async def processar_pdfs_pendentes():
    """Busca editais recentes sem PDF processado e extrai matérias."""
    if not GEMINI_API_KEY:
        print("[PDF] GEMINI_API_KEY ausente — etapa de PDF ignorada.")
        return

    limite_data = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    try:
        resp = supabase.table("editais") \
            .select("id, orgao, cargo, link_edital_pdf, link_inscricao, link_fonte, materias") \
            .eq("status", "ativo") \
            .eq("pdf_processado", False) \
            .gte("coletado_em", limite_data) \
            .limit(MAX_PDFS_POR_EXECUCAO) \
            .execute()
    except Exception as e:
        print(f"[PDF] Erro ao buscar editais pendentes: {e}")
        return

    pendentes = resp.data or []
    if not pendentes:
        print("[PDF] Nenhum edital pendente de processamento de PDF.")
        return

    print(f"\n[PDF] Processando {len(pendentes)} edital(is)...")

    for edital in pendentes:
        eid = edital["id"]
        nome = f"{edital['orgao']} — {edital['cargo']}"
        print(f"\n  → {nome}")

        atualizacao: dict = {"pdf_processado": True}

        # 1. Determinar URL do PDF
        link_pdf = edital.get("link_edital_pdf")
        if not link_pdf:
            # Tentar encontrar PDF na página de inscrição ou fonte
            for link_candidato in [edital.get("link_inscricao"), edital.get("link_fonte")]:
                if link_candidato:
                    link_pdf = await encontrar_link_pdf(link_candidato)
                    if link_pdf:
                        print(f"    PDF encontrado: {link_pdf}")
                        break

        if not link_pdf:
            print("    Sem PDF disponível.")
            supabase.table("editais").update(atualizacao).eq("id", eid).execute()
            continue

        # 2. Baixar PDF
        pdf_bytes = await baixar_pdf(link_pdf)
        if not pdf_bytes:
            print(f"    Falha ao baixar PDF ({link_pdf})")
            supabase.table("editais").update(atualizacao).eq("id", eid).execute()
            continue

        print(f"    PDF baixado: {len(pdf_bytes)/1024:.0f} KB")

        # 3. Upload para Supabase Storage
        storage_url = upload_pdf_storage(eid, pdf_bytes)
        if storage_url:
            atualizacao["link_edital_pdf"] = storage_url
            print(f"    Storage: OK")
        else:
            # Mantém o link externo original se upload falhar
            if link_pdf != edital.get("link_edital_pdf"):
                atualizacao["link_edital_pdf"] = link_pdf

        # 4. Extrair matérias via Gemini
        materias_atuais = edital.get("materias") or []
        if not materias_atuais:
            materias = extrair_materias_gemini(pdf_bytes)
            if materias:
                atualizacao["materias"] = materias
                print(f"    Matérias extraídas: {len(materias)} ({', '.join(materias[:5])}{'...' if len(materias) > 5 else ''})")
            else:
                print("    Sem matérias extraídas.")

        supabase.table("editais").update(atualizacao).eq("id", eid).execute()

    print(f"\n[PDF] Processamento concluído.")


# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

async def buscar_e_salvar():
    print(f"[CRAWLER] v11 — RSS + Claude Haiku + PDF/Gemini | hoje={HOJE}")

    # Etapa 1-3: coleta, classifica e salva editais
    itens = await coletar_itens_rss()
    if not itens:
        print("[CRAWLER] Nenhum item coletado.")
    else:
        itens_filtrados = pre_filtrar(itens)
        if not itens_filtrados:
            print("[CRAWLER] Nenhum item passou pelo pré-filtro.")
        else:
            editais_brutos = classificar_com_claude(itens_filtrados)
            salvos = ignorados = erros = 0
            for edital in editais_brutos:
                if edital_encerrado(edital):
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
            print(f"\n[CRAWLER] {salvos} salvos | {ignorados} ignorados | {erros} erros")

    # Etapa 4: processamento de PDFs (independente — não falha o crawler principal)
    try:
        await processar_pdfs_pendentes()
    except Exception as e:
        print(f"[PDF] Erro inesperado (não bloqueia): {e}")


if __name__ == "__main__":
    asyncio.run(buscar_e_salvar())
