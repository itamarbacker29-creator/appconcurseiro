"""
Crawler v14 — Um row por cargo em editais. Fluxo:
  1. Scrapers coletam editais das bancas e do DOU
  2. Upsert inicial em editais (uma linha por item coletado)
  3. extrair_cargos_inline(): baixa PDF → Claude → N rows em editais (um por cargo)
  4. processar_pdfs_pendentes(): fallback para editais sem PDF processado
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

HOJE = date.today().isoformat()
MAX_PDFS_POR_EXECUCAO = 10
MAX_PDF_BYTES = 3_000_000   # 3 MB


# ─────────────────────────────────────────────
# ETAPA 1 — COLETA FONTES PRIMÁRIAS
# ─────────────────────────────────────────────

async def coletar_fontes_primarias() -> list[dict]:
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))

    from scrapers.cebraspe import scrape as scrape_cebraspe
    from scrapers.fcc import scrape as scrape_fcc
    from scrapers.fgv import scrape as scrape_fgv
    from scrapers.vunesp import scrape as scrape_vunesp
    from scrapers.ibfc import scrape as scrape_ibfc
    from scrapers.quadrix import scrape as scrape_quadrix
    from scrapers.aocp import scrape as scrape_aocp
    from scrapers.cesgranrio import scrape as scrape_cesgranrio
    from scrapers.dou import scrape as scrape_dou

    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
        tarefas = [
            scrape_cebraspe(client), scrape_fcc(client), scrape_fgv(client),
            scrape_vunesp(client), scrape_ibfc(client), scrape_quadrix(client),
            scrape_aocp(client), scrape_cesgranrio(client), scrape_dou(client),
        ]
        resultados = await asyncio.gather(*tarefas, return_exceptions=True)

    editais: list[dict] = []
    for r in resultados:
        if isinstance(r, Exception):
            print(f"[FONTES] Erro em scraper: {r}")
        elif isinstance(r, list):
            editais.extend(r)

    print(f"[FONTES] Total bruto: {len(editais)} edital(is)")
    return editais


# ─────────────────────────────────────────────
# ETAPA 2 — NORMALIZAR E SALVAR
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

    def safe_list(v):
        return v if isinstance(v, list) else []

    def safe_jsonb(v):
        return v if isinstance(v, dict) else None

    escolaridade = edital.get("escolaridade") or "medio"
    if escolaridade not in ("fundamental", "medio", "superior"):
        escolaridade = "medio"

    nivel = edital.get("nivel") or "federal"
    if nivel not in ("federal", "estadual", "municipal"):
        nivel = "federal"

    area = edital.get("area") or "administrativo"
    if area not in ("tributario", "seguranca", "saude", "educacao", "judiciario", "tecnologia", "administrativo"):
        area = "administrativo"

    link_inscricao = str(edital.get("link_inscricao") or "").strip() or None
    link_fonte = str(edital.get("link_fonte") or "").strip() or None
    link_pdf = str(edital.get("link_edital_pdf") or "").strip() or None
    if link_pdf and not link_pdf.lower().endswith(".pdf") and "edital" not in link_pdf.lower():
        link_pdf = None

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
        "link_fonte":                 link_fonte,
        "taxa_inscricao":             parse_float(edital.get("taxa_inscricao")),
        "isencao_taxa":               safe_jsonb(edital.get("isencao_taxa")),
        "formacao_exigida":           safe_list(edital.get("formacao_exigida")),
        "registro_conselho_exigido":  safe_list(edital.get("registro_conselho_exigido")),
        "cotas":                      safe_jsonb(edital.get("cotas")),
        "etapas":                     safe_list(edital.get("etapas")),
        "local_prova":                safe_list(edital.get("local_prova")),
        "materias":                   safe_list(edital.get("materias")),
        "status":                     "ativo",
        "pdf_processado":             False,
    }


# ─────────────────────────────────────────────
# ETAPA 3 — PIPELINE DE PDF
# ─────────────────────────────────────────────

DOMINIOS_NOTICIAS = {
    "estrategiaconcursos", "grancursosonline", "tecconcursos", "qconcursos",
    "concursosnobrasil", "pciconcursos", "apostilas", "g1.globo", "uol.com",
    "facebook.com", "instagram.com", "youtube.com", "twitter.com", "x.com",
    "google.com", "bing.com", "yahoo.com", "terra.com", "r7.com", "folha.uol",
    "diariomunicipal.com.br", "news.google", "diariooficial",
}

def _eh_blog(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(d in host for d in DOMINIOS_NOTICIAS)

def _extrair_pdfs(soup, base_url: str) -> list[tuple[int, str]]:
    candidatos = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        if not href:
            continue
        abs_url = href if href.startswith("http") else urljoin(base_url, href)
        hl = abs_url.lower()
        tl = a.get_text(strip=True).lower()
        is_pdf = ".pdf" in hl
        is_edital_link = re.search(r'edital|abertura|concurso.*download|baixar.*edital|arquivo', hl + " " + tl, re.I)
        if not is_pdf and not is_edital_link:
            continue
        score = 0
        if "edital" in hl: score += 4
        if "abertura" in hl or "completo" in hl: score += 2
        if "edital" in tl: score += 3
        if "download" in tl or "baixar" in tl: score += 1
        if is_pdf: score += 2
        score += 1
        candidatos.append((score, abs_url))
    return candidatos

def _extrair_externos(soup, base_host: str) -> list[str]:
    links = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        if not href.startswith("http"):
            continue
        try:
            host = urlparse(href).netloc.lower()
        except Exception:
            continue
        if host == base_host or _eh_blog(href):
            continue
        links.append(href)
    return links

async def _raspar(url: str, client: httpx.AsyncClient) -> BeautifulSoup | None:
    try:
        resp = await client.get(url)
        return BeautifulSoup(resp.text, "lxml") if resp.status_code == 200 else None
    except Exception:
        return None

async def encontrar_link_pdf(url: str) -> str | None:
    if not url:
        return None
    if url.lower().endswith(".pdf"):
        return url

    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=headers) as client:
            soup1 = await _raspar(url, client)
            if not soup1:
                return None

            pdfs1 = _extrair_pdfs(soup1, url)
            if pdfs1:
                pdfs1.sort(reverse=True)
                return pdfs1[0][1]

            base_host = urlparse(url).netloc.lower()
            externos = _extrair_externos(soup1, base_host)

            priorizados = (
                [h for h in externos if re.search(r'concurso|edital|selec|inscri|fcc|cebraspe|vunesp|ibfc|aocp|quadrix|iades|ibam|cesgranrio|esaf|fgv|funrio', h, re.I)]
                + [h for h in externos if re.search(r'\.gov\.br|\.org\.br|\.jus\.br|\.mp\.br', h)]
                + externos
            )

            vistos: set[str] = set()
            for externo in priorizados[:8]:
                if externo in vistos:
                    continue
                vistos.add(externo)
                soup2 = await _raspar(externo, client)
                if not soup2:
                    continue
                pdfs2 = _extrair_pdfs(soup2, externo)
                if pdfs2:
                    pdfs2.sort(reverse=True)
                    return pdfs2[0][1]
    except Exception as e:
        print(f"  [PDF-FIND] Erro: {e}")
    return None


async def baixar_pdf(url: str) -> bytes | None:
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
        print(f"  [PDF-DL] Erro: {e}")
        return None


def upload_pdf_storage(edital_id: str, pdf_bytes: bytes) -> str | None:
    try:
        bucket = "editais-pdfs"
        try:
            supabase.storage.create_bucket(bucket, options={"public": True})
        except Exception:
            pass
        path = f"{edital_id}.pdf"
        try:
            supabase.storage.from_(bucket).remove([path])
        except Exception:
            pass
        supabase.storage.from_(bucket).upload(
            path=path, file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )
        return supabase.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        print(f"  [STORAGE] Erro: {e}")
        return None


AREAS_VALIDAS = {"tributario", "seguranca", "saude", "educacao", "judiciario", "tecnologia", "administrativo"}

PROMPT_CARGOS = """Analise este edital de concurso público e retorne APENAS este JSON (sem markdown):
{
  "banca": "nome da banca organizadora ou null",
  "link_inscricao": "URL oficial de inscrição (portal do órgão, não blog) ou null",
  "data_inscricao_inicio": "YYYY-MM-DD ou null",
  "data_inscricao_fim": "YYYY-MM-DD ou null",
  "cargos": [
    {
      "nome": "nome exato do cargo conforme o edital",
      "cidade": "cidade da vaga ou null se nacional/estadual",
      "materias": ["Matéria 1", "Matéria 2"],
      "salario": 0000.00,
      "vagas": 0,
      "formacao_exigida": ["Direito", "Medicina"],
      "registro_conselho_exigido": ["OAB", "CRM"],
      "local_prova": ["Cidade 1", "Cidade 2"],
      "data_prova": "YYYY-MM-DD ou null",
      "escolaridade": "fundamental|medio|superior",
      "area": "tributario|seguranca|saude|educacao|judiciario|tecnologia|administrativo",
      "cotas": {"pcd": 5, "racial": 20, "indigena": null, "quilombola": null},
      "etapas": ["Prova objetiva", "Prova discursiva", "Prova de títulos"]
    }
  ]
}
IMPORTANTE: Liste TODOS os cargos individualmente. Cada cargo tem suas próprias matérias. Use null para campos ausentes, [] para listas vazias."""


def extrair_campos_pdf_claude(pdf_bytes: bytes) -> dict:
    """Claude lê o PDF e retorna todos os cargos com dados individuais."""
    try:
        b64 = base64.b64encode(pdf_bytes).decode()
        msg = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                    {"type": "text", "text": PROMPT_CARGOS},
                ],
            }],
        )
        texto = msg.content[0].text if msg.content and msg.content[0].type == "text" else ""
        match = re.search(r'\{[\s\S]*\}', texto)
        if not match:
            return {}
        dados = json.loads(match.group())
        if not isinstance(dados, dict):
            return {}

        cargos_sanitizados = []
        for c in (dados.get("cargos") or []):
            if not isinstance(c, dict) or not c.get("nome"):
                continue
            area = c.get("area") if c.get("area") in AREAS_VALIDAS else "administrativo"
            escol = c.get("escolaridade") if c.get("escolaridade") in ("fundamental", "medio", "superior") else "superior"
            cargos_sanitizados.append({
                "nome":                      str(c["nome"]).strip()[:200],
                "cidade":                    str(c["cidade"]).strip()[:100] if c.get("cidade") else None,
                "materias":                  [str(m).strip() for m in (c.get("materias") or []) if m][:40],
                "salario":                   float(c["salario"]) if isinstance(c.get("salario"), (int, float)) else None,
                "vagas":                     int(c["vagas"]) if isinstance(c.get("vagas"), (int, float)) else None,
                "formacao_exigida":          c.get("formacao_exigida") if isinstance(c.get("formacao_exigida"), list) else [],
                "registro_conselho_exigido": c.get("registro_conselho_exigido") if isinstance(c.get("registro_conselho_exigido"), list) else [],
                "local_prova":               c.get("local_prova") if isinstance(c.get("local_prova"), list) else [],
                "data_prova":                c.get("data_prova") or None,
                "escolaridade":              escol,
                "area":                      area,
                "cotas":                     c.get("cotas") if isinstance(c.get("cotas"), dict) else None,
                "etapas":                    c.get("etapas") if isinstance(c.get("etapas"), list) else [],
            })

        dados["cargos"] = cargos_sanitizados
        return dados
    except Exception as e:
        print(f"  [CLAUDE-PDF] Erro: {e}")
    return {}


def _campos_cargo(c: dict) -> dict:
    """Campos específicos de um cargo para upsert em editais."""
    area = c.get("area") if c.get("area") in AREAS_VALIDAS else "administrativo"
    escol = c.get("escolaridade") if c.get("escolaridade") in ("fundamental", "medio", "superior") else "superior"
    return {
        "cargo":                      str(c["nome"]).strip()[:200],
        "cidade":                     str(c["cidade"]).strip()[:100] if c.get("cidade") else None,
        "materias":                   c.get("materias") or [],
        "salario":                    float(c["salario"]) if isinstance(c.get("salario"), (int, float)) else None,
        "vagas":                      int(c["vagas"]) if isinstance(c.get("vagas"), (int, float)) else None,
        "escolaridade":               escol,
        "area":                       area,
        "formacao_exigida":           c.get("formacao_exigida") if isinstance(c.get("formacao_exigida"), list) else [],
        "registro_conselho_exigido":  c.get("registro_conselho_exigido") if isinstance(c.get("registro_conselho_exigido"), list) else [],
        "local_prova":                c.get("local_prova") if isinstance(c.get("local_prova"), list) else [],
        "data_prova":                 c.get("data_prova") or None,
        "cotas":                      c.get("cotas") if isinstance(c.get("cotas"), dict) else None,
        "etapas":                     c.get("etapas") if isinstance(c.get("etapas"), list) else [],
    }


# ─────────────────────────────────────────────
# EXTRAÇÃO INLINE — logo após upsert
# ─────────────────────────────────────────────

async def extrair_cargos_inline(edital_id: str, dados: dict):
    """
    Baixa o PDF do edital e expande em N rows em editais (um por cargo).
    O row inicial é atualizado com dados do primeiro cargo.
    Cargos adicionais são inseridos como novos rows com os mesmos metadados globais.
    """
    pdf_link = dados.get("link_edital_pdf")

    if not pdf_link:
        for candidato in [dados.get("link_inscricao"), dados.get("link_fonte")]:
            if candidato:
                found = await encontrar_link_pdf(candidato)
                if found:
                    pdf_link = found
                    print(f"    [INLINE] PDF encontrado: {pdf_link}")
                    break

    if not pdf_link:
        print(f"    [INLINE] Sem PDF — marcando como processado.")
        supabase.table("editais").update({"pdf_processado": True}).eq("id", edital_id).execute()
        return

    pdf_bytes = await baixar_pdf(pdf_link)
    if not pdf_bytes:
        print(f"    [INLINE] Falha ao baixar PDF.")
        supabase.table("editais").update({"pdf_processado": True}).eq("id", edital_id).execute()
        return

    print(f"    [INLINE] PDF {len(pdf_bytes)/1024:.0f} KB — extraindo cargos com Claude...")
    campos = extrair_campos_pdf_claude(pdf_bytes)
    cargos = campos.get("cargos") or []

    if not cargos:
        print(f"    [INLINE] Nenhum cargo extraído do PDF.")
        supabase.table("editais").update({"pdf_processado": True}).eq("id", edital_id).execute()
        return

    nomes = ", ".join(c["nome"] for c in cargos[:3])
    mais = f" +{len(cargos)-3} mais" if len(cargos) > 3 else ""
    print(f"    [INLINE] {len(cargos)} cargo(s): {nomes}{mais}")

    # Sobe PDF ao Supabase Storage
    storage_url = upload_pdf_storage(edital_id, pdf_bytes)
    link_pdf_final = storage_url or pdf_link

    # Metadados globais do edital (vindos do PDF)
    meta_global: dict = {"pdf_processado": True, "link_edital_pdf": link_pdf_final}
    for campo in ("banca", "link_inscricao", "data_inscricao_inicio", "data_inscricao_fim"):
        val = campos.get(campo)
        if val:
            meta_global[campo] = val

    # Atualiza o row existente com dados do cargo[0] + metadados
    supabase.table("editais").update({**meta_global, **_campos_cargo(cargos[0])}).eq("id", edital_id).execute()

    if len(cargos) == 1:
        return

    # Campos base do edital para os rows adicionais (sem campos cargo-específicos)
    CAMPOS_CARGO = {"cargo", "cidade", "materias", "salario", "vagas", "escolaridade", "area",
                    "formacao_exigida", "registro_conselho_exigido", "local_prova",
                    "data_prova", "cotas", "etapas", "id", "pdf_processado"}
    base = {k: v for k, v in dados.items() if k not in CAMPOS_CARGO}
    base.update(meta_global)
    base["status"] = "ativo"

    inseridos = 0
    for cargo in cargos[1:]:
        novo = {**base, **_campos_cargo(cargo)}
        try:
            supabase.table("editais").upsert(novo, on_conflict="orgao,cargo,data_inscricao_fim").execute()
            inseridos += 1
        except Exception as e:
            print(f"    [INLINE] ✗ '{cargo['nome']}': {e}")

    print(f"    [INLINE] {inseridos} cargo(s) adicional(is) inserido(s)")


# ─────────────────────────────────────────────
# FALLBACK — editais pendentes de PDF
# ─────────────────────────────────────────────

async def processar_pdfs_pendentes():
    """Busca editais recentes sem PDF processado e extrai cargos."""
    limite_data = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    try:
        resp = supabase.table("editais") \
            .select("id, orgao, cargo, link_edital_pdf, link_inscricao, link_fonte, materias, estado, nivel, banca, data_inscricao_fim") \
            .eq("status", "ativo") \
            .eq("pdf_processado", False) \
            .gte("coletado_em", limite_data) \
            .limit(MAX_PDFS_POR_EXECUCAO) \
            .execute()
    except Exception as e:
        print(f"[PDF] Erro ao buscar pendentes: {e}")
        return

    pendentes = resp.data or []
    if not pendentes:
        print("[PDF] Nenhum edital pendente.")
        return

    print(f"\n[PDF] Fallback: {len(pendentes)} edital(is) pendentes...")

    for edital in pendentes:
        eid = edital["id"]
        print(f"\n  → {edital['orgao']} — {edital['cargo']}")

        link_pdf = edital.get("link_edital_pdf")
        if not link_pdf:
            for candidato in [edital.get("link_inscricao"), edital.get("link_fonte")]:
                if candidato:
                    link_pdf = await encontrar_link_pdf(candidato)
                    if link_pdf:
                        print(f"    PDF: {link_pdf}")
                        break

        if not link_pdf:
            print("    Sem PDF.")
            supabase.table("editais").update({"pdf_processado": True}).eq("id", eid).execute()
            continue

        pdf_bytes = await baixar_pdf(link_pdf)
        if not pdf_bytes:
            print(f"    Falha ao baixar.")
            supabase.table("editais").update({"pdf_processado": True}).eq("id", eid).execute()
            continue

        print(f"    PDF {len(pdf_bytes)/1024:.0f} KB — extraindo...")
        storage_url = upload_pdf_storage(eid, pdf_bytes)
        campos = extrair_campos_pdf_claude(pdf_bytes)
        cargos = campos.get("cargos") or []

        meta_global: dict = {
            "pdf_processado": True,
            "link_edital_pdf": storage_url or link_pdf,
        }
        for campo in ("banca", "link_inscricao", "data_inscricao_inicio", "data_inscricao_fim"):
            val = campos.get(campo)
            if val:
                meta_global[campo] = val

        if not cargos:
            print("    Sem cargos extraídos.")
            supabase.table("editais").update(meta_global).eq("id", eid).execute()
            continue

        nomes = ", ".join(c["nome"] for c in cargos[:3])
        mais = f" +{len(cargos)-3}" if len(cargos) > 3 else ""
        print(f"    {len(cargos)} cargo(s): {nomes}{mais}")

        # Atualiza row existente com cargo[0]
        supabase.table("editais").update({**meta_global, **_campos_cargo(cargos[0])}).eq("id", eid).execute()

        # Insere rows para demais cargos
        base = {
            "orgao": edital["orgao"],
            "nivel": edital.get("nivel", "federal"),
            "estado": edital.get("estado", "Nacional"),
            "status": "ativo",
        }
        base.update(meta_global)

        for cargo in cargos[1:]:
            try:
                supabase.table("editais").upsert({**base, **_campos_cargo(cargo)}, on_conflict="orgao,cargo,data_inscricao_fim").execute()
            except Exception as e:
                print(f"    ✗ '{cargo['nome']}': {e}")

    print("[PDF] Processamento concluído.")


# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

async def buscar_e_salvar():
    print(f"[CRAWLER] v14 — um row por cargo | hoje={HOJE}")

    editais_brutos = await coletar_fontes_primarias()
    if editais_brutos:
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
                    local = f"{dados['cidade']}/{dados['estado']}" if dados.get('cidade') else dados['estado']
                    print(f"  ✓ [{dados['nivel']}] {dados['orgao']} — {dados['cargo']} | {vagas_str} | {local}")
                    # Extrai cargos do PDF se ainda não tem matérias
                    if not edital_row.get("materias"):
                        await extrair_cargos_inline(edital_row["id"], dados)
            except Exception as e:
                print(f"  ✗ {e}")
                erros += 1
        print(f"\n[CRAWLER] {salvos} salvos | {ignorados} ignorados | {erros} erros")
    else:
        print("[CRAWLER] Nenhum edital coletado.")

    try:
        await processar_pdfs_pendentes()
    except Exception as e:
        print(f"[PDF] Erro inesperado: {e}")


if __name__ == "__main__":
    asyncio.run(buscar_e_salvar())
