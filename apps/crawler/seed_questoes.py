"""
seed_questoes.py — Popula banco de questões reais a partir de PDFs de provas oficiais.

Uso:
  python seed_questoes.py                       # processa provas_manifest.json
  python seed_questoes.py --dry-run             # exibe sem inserir
  python seed_questoes.py --limit 100           # máximo de questões por prova
  python seed_questoes.py --manifest outro.json # manifest alternativo

Formato do manifest (provas_manifest.json):
[
  {
    "banca": "CEBRASPE",
    "concurso": "Polícia Federal 2023 - Delegado",
    "prova_url": "https://cdn.cebraspe.org.br/.../prova.pdf",
    "gabarito_url": "https://cdn.cebraspe.org.br/.../gabarito.pdf"
  }
]
"""

import argparse, base64, json, os, re, sys, time, pathlib
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL   = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY   = os.getenv("SUPABASE_SERVICE_KEY")
ANTHROPIC_KEY  = os.getenv("ANTHROPIC_API_KEY")

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "provas_manifest.json")
MAX_PDF_MB    = 20
MAX_RETRIES   = 2
MODEL         = "claude-sonnet-4-6"

MATERIAS_VALIDAS = [
    # Direito
    "Direito Constitucional", "Direito Administrativo", "Direito Penal",
    "Direito Processual Penal", "Direito Civil", "Direito do Trabalho",
    "Direito Tributário", "Direito Empresarial", "Direito Processual Civil",
    # Geral
    "Português", "Língua Inglesa", "Matemática", "Raciocínio Lógico",
    "Informática", "Administração", "Economia", "Contabilidade",
    "Finanças Públicas", "Legislação Específica", "Atualidades",
    "Conhecimentos Gerais", "Estatística",
    # Saúde
    "Saúde Pública", "Epidemiologia", "Enfermagem", "Farmácia",
    "Odontologia", "Fisioterapia", "Nutrição", "Psicologia", "Serviço Social",
]

PROMPT_QUESTOES = (
    "Analise este PDF de prova de concurso público brasileiro e extraia TODAS as questões de múltipla escolha.\n"
    "Retorne APENAS um array JSON válido, sem markdown:\n"
    "[\n"
    "  {\n"
    '    "numero": 1,\n'
    '    "enunciado": "texto completo da questão, incluindo textos de apoio",\n'
    '    "opcoes": [\n'
    '      {"letra": "A", "texto": "..."},\n'
    '      {"letra": "B", "texto": "..."},\n'
    '      {"letra": "C", "texto": "..."},\n'
    '      {"letra": "D", "texto": "..."},\n'
    '      {"letra": "E", "texto": "..."}\n'
    "    ],\n"
    '    "materia": "Direito Constitucional",\n'
    '    "subtopico": "Princípios Fundamentais",\n'
    '    "nivel": 3\n'
    "  }\n"
    "]\n\n"
    "Regras:\n"
    "- nivel: 1=muito fácil, 2=fácil, 3=médio, 4=difícil, 5=muito difícil\n"
    '- Se houver questões CERTO/ERRADO (CESPE/CEBRASPE), opcoes=[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]\n'
    "- materia deve ser uma de: " + ", ".join(MATERIAS_VALIDAS) + "\n"
    "- Inclua TODO o texto base/referência no enunciado\n"
    "- Ignore instruções, capas e folhas de rosto\n"
    "- numero deve ser o número da questão na prova (inteiro)"
)

PROMPT_GABARITO = (
    "Extraia o gabarito oficial deste PDF de concurso.\n"
    'Retorne APENAS um objeto JSON: {"1": "C", "2": "A", "3": "E", ...}\n'
    "Use apenas a letra da alternativa correta para cada número de questão.\n"
    "Sem markdown, sem texto adicional."
)


# ─── Claude (Anthropic) ───────────────────────────────────────────────────────

def chamar_claude(pdf_bytes: bytes, prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    for tentativa in range(MAX_RETRIES):
        try:
            texto = ""
            with client.messages.stream(
                model=MODEL,
                max_tokens=32000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": pdf_b64,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            ) as stream:
                for chunk in stream.text_stream:
                    texto += chunk
            return texto.strip()
        except Exception as e:
            if tentativa < MAX_RETRIES - 1:
                print(f"    Claude erro ({e}) — retry {tentativa + 1}...")
                time.sleep(5)
            else:
                raise


# ─── Supabase REST ────────────────────────────────────────────────────────────

def supabase_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

def supabase_insert(registro: dict) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/questoes"
    with httpx.Client(timeout=30) as client:
        r = client.post(url, headers=supabase_headers(), json=registro)
        if r.status_code in (200, 201):
            return True
        print(f"    Supabase erro {r.status_code}: {r.text[:200]}")
        return False

def supabase_check_duplicate(enunciado: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/questoes"
    params = {"select": "id", "enunciado": f"like.{enunciado[:80]}%", "limit": "1"}
    with httpx.Client(timeout=15) as client:
        r = client.get(url, headers=supabase_headers(), params=params)
        if r.status_code == 200:
            return len(r.json()) > 0
    return False


# ─── Helpers ─────────────────────────────────────────────────────────────────

def extrair_json(texto: str):
    texto = re.sub(r"^```(?:json)?\s*", "", texto, flags=re.MULTILINE)
    texto = re.sub(r"\s*```\s*$", "", texto, flags=re.MULTILINE)
    texto = texto.strip()
    for ch_open, ch_close in [("[", "]"), ("{", "}")]:
        start = texto.find(ch_open)
        if start >= 0:
            end = texto.rfind(ch_close)
            if end > start:
                return json.loads(texto[start : end + 1])
    raise ValueError(f"Nenhum JSON encontrado: {texto[:300]}")


def baixar_pdf(url: str) -> bytes | None:
    try:
        with httpx.Client(timeout=90, follow_redirects=True) as client:
            r = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; bot)"})
            r.raise_for_status()
            data = r.content
            mb = len(data) / 1_000_000
            if mb > MAX_PDF_MB:
                print(f"    PDF muito grande ({mb:.1f}MB) — pulando.")
                return None
            print(f"    {mb:.1f} MB baixados")
            return data
    except Exception as e:
        print(f"    Erro ao baixar {url}: {e}")
        return None


def normalizar_materia(raw: str) -> str:
    raw = raw.strip()
    for m in MATERIAS_VALIDAS:
        if raw.lower() == m.lower():
            return m
    raw_lower = raw.lower()
    for m in MATERIAS_VALIDAS:
        if any(w in raw_lower for w in m.lower().split()):
            return m
    return "Legislação Específica"


# ─── Processamento ───────────────────────────────────────────────────────────

def processar_prova(entrada: dict, dry_run: bool, limite: int) -> int:
    banca           = entrada.get("banca", "").strip()
    concurso        = entrada.get("concurso", "").strip()
    prova_url       = entrada.get("prova_url", "").strip()
    gabarito_url    = entrada.get("gabarito_url", "").strip()
    gabarito_inline = entrada.get("gabarito")

    print(f"\n{'─' * 60}")
    print(f"  {concurso} | {banca}")

    # Baixar prova
    if prova_url.startswith("http"):
        print(f"  Baixando prova...")
        prova_bytes = baixar_pdf(prova_url)
    else:
        p = pathlib.Path(prova_url)
        prova_bytes = p.read_bytes() if p.exists() else None

    if not prova_bytes:
        print("  ERRO: nao foi possivel obter PDF da prova — pulando.")
        return 0

    # Baixar gabarito
    gabarito_bytes = None
    if gabarito_url.startswith("http"):
        print(f"  Baixando gabarito...")
        gabarito_bytes = baixar_pdf(gabarito_url)
    elif gabarito_url:
        p = pathlib.Path(gabarito_url)
        gabarito_bytes = p.read_bytes() if p.exists() else None

    # Extrair questoes
    print(f"  Extraindo questoes com Claude {MODEL}...")
    try:
        raw = chamar_claude(prova_bytes, PROMPT_QUESTOES)
        print(f"  Resposta: {len(raw)} chars")
        questoes = extrair_json(raw)
        if not isinstance(questoes, list):
            raise ValueError("Retorno nao e lista")
        print(f"  {len(questoes)} questoes extraidas")
    except json.JSONDecodeError as e:
        # Tenta recuperar JSON parcial até o último objeto completo
        raw_clean = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw_clean = re.sub(r"\s*```\s*$", "", raw_clean, flags=re.MULTILINE).strip()
        start = raw_clean.find("[")
        if start >= 0:
            # Encontra o último "}" antes do fim para tentar fechar o array
            last_obj = raw_clean.rfind("}")
            if last_obj > start:
                tentativa = raw_clean[start : last_obj + 1] + "]"
                try:
                    questoes = json.loads(tentativa)
                    print(f"  {len(questoes)} questoes extraidas (JSON recuperado parcialmente)")
                except Exception:
                    print(f"  ERRO ao extrair questoes (JSON invalido): {e}")
                    print(f"  Trecho final: ...{raw[-200:]}")
                    return 0
            else:
                print(f"  ERRO ao extrair questoes: {e}")
                return 0
        else:
            print(f"  ERRO ao extrair questoes: {e}")
            print(f"  Resposta completa: {raw[:500]}")
            return 0
    except Exception as e:
        print(f"  ERRO ao extrair questoes: {e}")
        return 0

    # Extrair gabarito
    gabarito_map: dict[str, str] = {}
    if gabarito_inline and isinstance(gabarito_inline, dict):
        gabarito_map = {str(k): str(v).upper() for k, v in gabarito_inline.items()}
        print(f"  Gabarito inline: {len(gabarito_map)} respostas")
    elif gabarito_bytes:
        print(f"  Extraindo gabarito com Claude...")
        try:
            raw_gab = chamar_claude(gabarito_bytes, PROMPT_GABARITO)
            gab_parsed = extrair_json(raw_gab)
            if isinstance(gab_parsed, dict):
                gabarito_map = {str(k): str(v).upper() for k, v in gab_parsed.items()}
                print(f"  {len(gabarito_map)} respostas extraidas do gabarito")
        except Exception as e:
            print(f"  Aviso: falha no gabarito ({e}) — questoes sem gabarito serao ignoradas")

    if not gabarito_map:
        print("  ERRO: sem gabarito — impossivel inserir questoes sem resposta correta.")
        return 0

    # Auto-detecta offset: tenta match direto primeiro, depois tenta com offset
    numeros_questoes = [str(q.get("numero", "")).strip() for q in questoes]
    matches_diretos = sum(1 for n in numeros_questoes if gabarito_map.get(n))
    offset = 0
    if matches_diretos == 0 and gabarito_map and numeros_questoes:
        min_gab = min(int(k) for k in gabarito_map if k.isdigit())
        min_q   = min(int(n) for n in numeros_questoes if n.isdigit())
        offset  = min_gab - min_q
        if offset != 0:
            print(f"  Offset detectado: +{offset} (gabarito comeca em {min_gab}, questoes em {min_q})")

    # Inserir questoes
    inseridas = 0
    ignoradas = 0
    for q in questoes[:limite]:
        num_raw  = str(q.get("numero", "")).strip()
        num_gab  = str(int(num_raw) + offset) if num_raw.isdigit() else num_raw
        gabarito = gabarito_map.get(num_gab, gabarito_map.get(num_raw, "")).upper()

        if not gabarito or gabarito == "X":
            ignoradas += 1
            continue

        enunciado = (q.get("enunciado") or "").strip()
        if len(enunciado) < 30:
            ignoradas += 1
            continue

        opcoes = q.get("opcoes") or []
        if len(opcoes) < 2:
            ignoradas += 1
            continue

        letras = {o.get("letra", "").upper() for o in opcoes}
        if gabarito not in letras:
            ignoradas += 1
            continue

        materia   = normalizar_materia(q.get("materia") or "Legislacao Especifica")
        subtopico = (q.get("subtopico") or "").strip() or None
        nivel     = max(1, min(5, int(q.get("nivel") or 3)))

        registro = {
            "materia": materia,
            "subtopico": subtopico,
            "banca": banca or None,
            "nivel": nivel,
            "enunciado": enunciado,
            "opcoes": opcoes,
            "gabarito": gabarito,
            "origem": "real",
            "ativo": True,
        }

        if dry_run:
            print(f"    [DRY] Q{num_raw}: {materia} | nivel {nivel} | gab {gabarito} | {enunciado[:70]}...")
            inseridas += 1
            continue

        if supabase_check_duplicate(enunciado):
            ignoradas += 1
            continue

        if supabase_insert(registro):
            inseridas += 1
        else:
            ignoradas += 1

    print(f"  Resultado: {inseridas} inseridas, {ignoradas} ignoradas/sem-gabarito")
    return inseridas


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed de questoes reais de provas oficiais")
    parser.add_argument("--manifest", default=MANIFEST_PATH)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=200)
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar no .env")
        sys.exit(1)
    if not ANTHROPIC_KEY:
        print("ERRO: ANTHROPIC_API_KEY precisa estar no .env")
        sys.exit(1)

    if not os.path.exists(args.manifest):
        print(f"Manifest nao encontrado: {args.manifest}")
        sys.exit(1)

    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)

    print(f"{'='*60}")
    print(f"Seed de questoes reais ({MODEL}) — {len(manifest)} prova(s)")
    if args.dry_run:
        print("MODO DRY RUN — nenhuma insercao sera feita")
    print(f"{'='*60}")

    total = 0
    for i, entrada in enumerate(manifest):
        print(f"\n[{i+1}/{len(manifest)}]", end="")
        total += processar_prova(entrada, dry_run=args.dry_run, limite=args.limit)
        if i < len(manifest) - 1:
            time.sleep(2)

    print(f"\n{'='*60}")
    print(f"Total: {total} questoes {'(dry run)' if args.dry_run else 'inseridas no banco'}")


if __name__ == "__main__":
    main()
