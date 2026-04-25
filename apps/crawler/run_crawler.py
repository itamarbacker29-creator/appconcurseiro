"""
Crawler v12 — RSS + Claude Haiku + extração de PDF via Claude Haiku.

Fluxo:
  1. Coleta itens de feeds RSS de portais de concursos
  2. Pré-filtra por palavras-chave (sem chamar IA)
  3. Claude Haiku classifica e extrai campos estruturados
  4. Upsert no Supabase
  5. Extração inline de matérias via PDF logo após cada insert
  6. (Fallback) processar_pdfs_pendentes para editais que falharam no passo 5
"""
import asyncio, base64, json, os, re, time
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
  "data_prova": "YYYY-MM-DD" ou null,
  "link_inscricao": "URL completa ou null",
  "link_edital_pdf": "URL do PDF do edital oficial ou null",
  "taxa_inscricao": número float ou null,
  "isencao_taxa": {{"disponivel": true/false, "criterios": ["CadÚnico"]}} ou null,
  "formacao_exigida": ["Direito", "Administração"] ou [],
  "registro_conselho_exigido": ["OAB"] ou [],
  "cotas": {{"pcd": 5, "racial": 20, "indigena": null, "quilombola": null}} ou null,
  "etapas": ["Prova objetiva", "Prova discursiva"] ou [],
  "local_prova": ["São Paulo"] ou []
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

    def safe_list(v):
        return v if isinstance(v, list) else []

    def safe_jsonb(v):
        return v if isinstance(v, dict) else None

    return {
        "orgao":                      orgao,
        "cargo":                      cargo,
        "escolaridade":               escolaridade,
        "nivel":                      nivel,
        "cidade":                     str(edital["cidade"]).strip()[:100] if edital.get("cidade") else None,
        "estado":                     str(edital.get("estado") or "Nacional").strip()[:10],
        "area":                       area,
        "vagas":                      parse_int(edital.get("vagas")),
        "salario":                    parse_float(edital.get("salario")),
        "banca":                      str(edital["banca"]).strip()[:100] if edital.get("banca") else None,
        "data_inscricao_inicio":      edital.get("data_inscricao_inicio") or None,
        "data_inscricao_fim":         edital.get("data_inscricao_fim") or None,
        "data_prova":                 edital.get("data_prova") or None,
        "link_inscricao":             link_inscricao,
        "link_edital_pdf":            link_pdf,
        "taxa_inscricao":             parse_float(edital.get("taxa_inscricao")),
        "isencao_taxa":               safe_jsonb(edital.get("isencao_taxa")),
        "formacao_exigida":           safe_list(edital.get("formacao_exigida")),
        "registro_conselho_exigido":  safe_list(edital.get("registro_conselho_exigido")),
        "cotas":                      safe_jsonb(edital.get("cotas")),
        "etapas":                     safe_list(edital.get("etapas")),
        "local_prova":                safe_list(edital.get("local_prova")),
        "materias":                   [],
        "status":                     "ativo",
        "pdf_processado":             False,
    }


# ─────────────────────────────────────────────
# ETAPA 4 — PIPELINE DE PDF (novo)
# ─────────────────────────────────────────────

DOMINIOS_OFICIAIS = (
    ".gov.br", ".jus.br", ".leg.br", ".mp.br", ".tc.br", ".def.br",
    "prefeitura", "camara", "tribunal", "ministerio", "concurso", "selecao",
)

def _e_dominio_oficial(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(d in host for d in DOMINIOS_OFICIAIS)

def _extrair_pdfs_de_soup(soup, base_url: str) -> list[tuple[int, str]]:
    candidatos = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        if not href:
            continue
        href_abs = href if href.startswith("http") else urljoin(base_url, href)
        href_lower = href_abs.lower()
        if ".pdf" not in href_lower:
            continue
        score = 0
        if "edital" in href_lower: score += 4
        if "abertura" in href_lower or "completo" in href_lower: score += 2
        texto = a.get_text(strip=True).lower()
        if "edital" in texto: score += 2
        score += 1
        candidatos.append((score, href_abs))
    return candidatos

async def _raspar_pagina(url: str, client: httpx.AsyncClient) -> BeautifulSoup | None:
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        return BeautifulSoup(resp.text, "lxml")
    except Exception:
        return None

async def encontrar_link_pdf(url: str) -> str | None:
    """
    Busca PDF em 2 níveis:
    1. Raspa a URL fornecida procurando links .pdf
    2. Se não achar, segue links para domínios oficiais e raspa esses também
    """
    if not url:
        return None
    if url.lower().endswith(".pdf"):
        return url

    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=headers) as client:
            soup1 = await _raspar_pagina(url, client)
            if soup1 is None:
                return None

            candidatos = _extrair_pdfs_de_soup(soup1, url)
            if candidatos:
                candidatos.sort(reverse=True)
                return candidatos[0][1]

            # Nível 2 — segue links para domínios oficiais
            links_oficiais: list[str] = []
            for a in soup1.find_all("a", href=True):
                href = str(a["href"]).strip()
                if not href or not href.startswith("http"):
                    continue
                if href == url:
                    continue
                if _e_dominio_oficial(href):
                    links_oficiais.append(href)

            for link_oficial in links_oficiais[:5]:
                print(f"  [PDF-FIND] Nível 2: {link_oficial}")
                soup2 = await _raspar_pagina(link_oficial, client)
                if soup2 is None:
                    continue
                candidatos2 = _extrair_pdfs_de_soup(soup2, link_oficial)
                if candidatos2:
                    candidatos2.sort(reverse=True)
                    return candidatos2[0][1]

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


def extrair_campos_pdf_claude(pdf_bytes: bytes) -> dict:
    """
    Usa Claude Haiku com PDF inline para extrair matérias e campos estruturados.
    Retorna dict com campos encontrados (vazio em caso de falha).
    """
    try:
        b64 = base64.b64encode(pdf_bytes).decode()
        msg = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analise este edital de concurso público e retorne APENAS um JSON:\n"
                            '{"materias": ["Português", "Direito Constitucional", "Raciocínio Lógico"]}\n'
                            "Liste TODAS as matérias cobradas na prova. Sem markdown, sem texto adicional. "
                            "Máximo 40 matérias."
                        ),
                    },
                ],
            }],
        )
        texto = msg.content[0].text if msg.content[0].type == "text" else ""
        match = re.search(r'\{[\s\S]*\}', texto)
        if not match:
            return {}
        dados = json.loads(match.group())
        if not isinstance(dados, dict):
            return {}
        if isinstance(dados.get("materias"), list):
            dados["materias"] = [str(m).strip() for m in dados["materias"] if m][:40]
        return dados
    except Exception as e:
        print(f"  [CLAUDE-PDF] Erro na extração: {e}")
    return {}


async def processar_pdfs_pendentes():
    """Fallback: busca editais recentes sem PDF processado e extrai matérias."""

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

        # 4. Extrair campos estruturados via Claude Haiku
        campos = extrair_campos_pdf_claude(pdf_bytes)
        if campos:
            CAMPOS_PDF = [
                "materias", "taxa_inscricao", "isencao_taxa", "formacao_exigida",
                "registro_conselho_exigido", "cotas", "etapas", "local_prova",
                "data_prova", "data_inscricao_inicio", "data_inscricao_fim",
            ]
            for campo in CAMPOS_PDF:
                val = campos.get(campo)
                if val is not None:
                    # Não sobrescreve campos que já existem no edital (ex: datas já salvas)
                    if not edital.get(campo):
                        atualizacao[campo] = val
            materias = campos.get("materias") or []
            if materias:
                print(f"    Matérias: {len(materias)} ({', '.join(materias[:4])}{'…' if len(materias) > 4 else ''})")
            print(f"    Campos extraídos: {len([k for k in CAMPOS_PDF if campos.get(k)])}")
        else:
            print("    Sem campos extraídos do PDF.")

        supabase.table("editais").update(atualizacao).eq("id", eid).execute()

    print(f"\n[PDF] Processamento concluído.")


# ─────────────────────────────────────────────
# EXTRAÇÃO INLINE — logo após insert
# ─────────────────────────────────────────────

async def extrair_materias_inline(edital_id: str, dados: dict):
    """Baixa o PDF e extrai matérias imediatamente após o insert de um edital."""
    pdf_link = dados.get("link_edital_pdf")

    # Se não tiver PDF direto, tenta encontrar na página de inscrição
    if not pdf_link:
        for candidato in [dados.get("link_inscricao"), dados.get("link_fonte")]:
            if candidato:
                pdf_link = await encontrar_link_pdf(candidato)
                if pdf_link:
                    break

    if not pdf_link:
        print(f"    [INLINE] Sem PDF disponível para extração.")
        return

    pdf_bytes = await baixar_pdf(pdf_link)
    if not pdf_bytes:
        print(f"    [INLINE] Falha ao baixar PDF.")
        return

    print(f"    [INLINE] PDF baixado: {len(pdf_bytes)/1024:.0f} KB — extraindo matérias...")
    campos = extrair_campos_pdf_claude(pdf_bytes)
    materias = campos.get("materias") or []

    if not materias:
        print(f"    [INLINE] Nenhuma matéria extraída.")
        supabase.table("editais").update({"pdf_processado": True}).eq("id", edital_id).execute()
        return

    print(f"    [INLINE] {len(materias)} matérias: {', '.join(materias[:4])}{'…' if len(materias) > 4 else ''}")

    # Upload do PDF para Storage (para uso futuro pelo leitor)
    storage_url = upload_pdf_storage(edital_id, pdf_bytes)
    atualizacao: dict = {"materias": materias, "pdf_processado": True}
    if storage_url:
        atualizacao["link_edital_pdf"] = storage_url
    elif pdf_link != dados.get("link_edital_pdf"):
        atualizacao["link_edital_pdf"] = pdf_link

    supabase.table("editais").update(atualizacao).eq("id", edital_id).execute()


# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

async def buscar_e_salvar():
    print(f"[CRAWLER] v12 — RSS + Claude Haiku + PDF/Claude inline | hoje={HOJE}")

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
                        edital_row = r.data[0]
                        vagas_str = f"{dados['vagas']} vagas" if dados['vagas'] else "vagas n/d"
                        local = f"{dados['cidade']}/{dados['estado']}" if dados['cidade'] else dados['estado']
                        print(f"  ✓ [{dados['nivel']}] {dados['orgao']} — {dados['cargo']} | {vagas_str} | {local}")
                        # Extração inline: se edital não tem matérias ainda, extrai agora
                        if not edital_row.get("materias"):
                            await extrair_materias_inline(edital_row["id"], dados)
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
