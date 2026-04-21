"""
seed_questoes.py — Popula banco de questões reais a partir de PDFs de provas oficiais.

Uso:
  python seed_questoes.py                       # processa provas_manifest.json
  python seed_questoes.py --dry-run             # exibe sem inserir
  python seed_questoes.py --limit 100           # máximo de questões por prova
  python seed_questoes.py --manifest outro.json # manifest alternativo
  python seed_questoes.py --folder ./provas/    # PDFs locais (veja --help)

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

import argparse, base64, json, os, re, sys, time, tempfile, pathlib
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_KEY   = os.getenv("GEMINI_API_KEY")

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "provas_manifest.json")
MAX_PDF_MB    = 15
MAX_RETRIES   = 2

MATERIAS_VALIDAS = [
    "Direito Constitucional", "Direito Administrativo", "Direito Penal",
    "Direito Processual Penal", "Direito Civil", "Direito do Trabalho",
    "Direito Tributário", "Direito Empresarial", "Direito Processual Civil",
    "Português", "Inglês", "Matemática", "Raciocínio Lógico",
    "Informática", "Administração", "Economia", "Contabilidade",
    "Finanças Públicas", "Legislação Específica", "Atualidades",
    "Conhecimentos Gerais", "Estatística",
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
    "- Se houver questões CERTO/ERRADO (CESPE/CEBRASPE), opcoes=[{\"letra\":\"C\",\"texto\":\"Certo\"},{\"letra\":\"E\",\"texto\":\"Errado\"}]\n"
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


# ─── Gemini ──────────────────────────────────────────────────────────────────

def _gemini_client():
    from google import genai as google_genai
    return google_genai.Client(api_key=GEMINI_KEY)

def chamar_gemini(pdf_bytes: bytes, prompt: str) -> str:
    from google.genai import types as gtypes
    client = _gemini_client()
    for tentativa in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    gtypes.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    prompt,
                ],
            )
            return response.text.strip()
        except Exception as e:
            if tentativa < MAX_RETRIES - 1:
                print(f"    Gemini erro ({e}) — retry {tentativa + 1}...")
                time.sleep(5)
            else:
                raise


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
            if len(data) > MAX_PDF_MB * 1_000_000:
                print(f"    Aviso: PDF grande ({len(data)//1_000_000}MB) — pode ser lento")
            return data
    except Exception as e:
        print(f"    Erro ao baixar {url}: {e}")
        return None


def normalizar_materia(raw: str) -> str:
    """Tenta encaixar a matéria extraída em uma da lista válida."""
    raw = raw.strip()
    for m in MATERIAS_VALIDAS:
        if raw.lower() == m.lower():
            return m
    # Busca parcial
    raw_lower = raw.lower()
    for m in MATERIAS_VALIDAS:
        if any(w in raw_lower for w in m.lower().split()):
            return m
    return "Legislação Específica"


# ─── Processamento ───────────────────────────────────────────────────────────

def processar_prova(entrada: dict, supabase, dry_run: bool, limite: int) -> int:
    banca       = entrada.get("banca", "").strip()
    concurso    = entrada.get("concurso", "").strip()
    prova_url   = entrada.get("prova_url", "").strip()
    gabarito_url = entrada.get("gabarito_url", "").strip()
    gabarito_inline = entrada.get("gabarito")  # dict {num: letra} direto no manifest

    print(f"\n{'─' * 60}")
    print(f"  {concurso} | {banca}")

    # Baixar prova
    if prova_url.startswith("http"):
        print(f"  Baixando prova...")
        prova_bytes = baixar_pdf(prova_url)
    else:
        # Arquivo local
        p = pathlib.Path(prova_url)
        prova_bytes = p.read_bytes() if p.exists() else None

    if not prova_bytes:
        print("  ERRO: não foi possível obter PDF da prova — pulando.")
        return 0

    # Baixar gabarito
    gabarito_bytes = None
    if gabarito_url.startswith("http"):
        print(f"  Baixando gabarito...")
        gabarito_bytes = baixar_pdf(gabarito_url)
    elif gabarito_url:
        p = pathlib.Path(gabarito_url)
        gabarito_bytes = p.read_bytes() if p.exists() else None

    # Extrair questões
    print(f"  Extraindo questões com Gemini...")
    try:
        raw = chamar_gemini(prova_bytes, PROMPT_QUESTOES)
        questoes = extrair_json(raw)
        if not isinstance(questoes, list):
            raise ValueError("Retorno não é lista")
        print(f"  {len(questoes)} questões extraídas")
    except Exception as e:
        print(f"  ERRO ao extrair questões: {e}")
        return 0

    # Extrair gabarito
    gabarito_map: dict[str, str] = {}
    if gabarito_inline and isinstance(gabarito_inline, dict):
        gabarito_map = {str(k): str(v).upper() for k, v in gabarito_inline.items()}
        print(f"  Gabarito inline: {len(gabarito_map)} respostas")
    elif gabarito_bytes:
        print(f"  Extraindo gabarito com Gemini...")
        try:
            raw_gab = chamar_gemini(gabarito_bytes, PROMPT_GABARITO)
            gab_parsed = extrair_json(raw_gab)
            if isinstance(gab_parsed, dict):
                gabarito_map = {str(k): str(v).upper() for k, v in gab_parsed.items()}
                print(f"  {len(gabarito_map)} respostas extraídas do gabarito")
        except Exception as e:
            print(f"  Aviso: falha no gabarito ({e}) — questões sem gabarito serão ignoradas")

    if not gabarito_map:
        print("  ERRO: sem gabarito — impossível inserir questões sem resposta correta.")
        return 0

    # Inserir questões
    inseridas = 0
    ignoradas = 0
    for q in questoes[:limite]:
        num     = str(q.get("numero", "")).strip()
        gabarito = gabarito_map.get(num, "").upper()

        if not gabarito:
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

        # Valida que gabarito é uma das letras das opcoes
        letras = {o.get("letra", "").upper() for o in opcoes}
        if gabarito not in letras:
            ignoradas += 1
            continue

        materia  = normalizar_materia(q.get("materia") or "Legislação Específica")
        subtopico = (q.get("subtopico") or "").strip() or None
        nivel    = max(1, min(5, int(q.get("nivel") or 3)))

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
            print(f"    [DRY] Q{num}: {materia} | nível {nivel} | gab {gabarito} | {enunciado[:70]}...")
            inseridas += 1
            continue

        # Verificar duplicata por enunciado (primeiros 200 chars)
        trecho = enunciado[:200]
        try:
            res = supabase.from_("questoes").select("id").like("enunciado", trecho[:80] + "%").limit(1).execute()
            if res.data:
                ignoradas += 1
                continue
        except Exception:
            pass  # ignora erro na verificação de duplicata

        try:
            supabase.from_("questoes").insert(registro).execute()
            inseridas += 1
        except Exception as e:
            print(f"    Erro ao inserir Q{num}: {e}")

    print(f"  Resultado: {inseridas} inseridas, {ignoradas} ignoradas/sem-gabarito")
    return inseridas


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed de questões reais de provas oficiais")
    parser.add_argument("--manifest", default=MANIFEST_PATH, help="Caminho do manifest JSON (padrão: provas_manifest.json)")
    parser.add_argument("--dry-run", action="store_true", help="Exibe questões sem inserir no banco")
    parser.add_argument("--limit", type=int, default=200, help="Máximo de questões por prova (padrão: 200)")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar no .env")
        sys.exit(1)
    if not GEMINI_KEY:
        print("ERRO: GEMINI_API_KEY precisa estar no .env")
        sys.exit(1)

    if not os.path.exists(args.manifest):
        print(f"Manifest não encontrado: {args.manifest}")
        print("\nCrie o arquivo provas_manifest.json com este formato:")
        print(json.dumps([
            {
                "banca": "CEBRASPE",
                "concurso": "Nome do Concurso - Cargo - Ano",
                "prova_url": "https://url-publica-do-pdf-da-prova.pdf",
                "gabarito_url": "https://url-publica-do-pdf-do-gabarito.pdf"
            }
        ], indent=2, ensure_ascii=False))
        sys.exit(1)

    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)

    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"{'='*60}")
    print(f"Seed de questões reais — {len(manifest)} prova(s) no manifest")
    if args.dry_run:
        print("MODO DRY RUN — nenhuma inserção será feita")
    print(f"{'='*60}")

    total = 0
    for i, entrada in enumerate(manifest):
        print(f"\n[{i+1}/{len(manifest)}]", end="")
        total += processar_prova(entrada, supabase_client, dry_run=args.dry_run, limite=args.limit)
        if i < len(manifest) - 1:
            time.sleep(3)  # pausa entre provas para não saturar Gemini

    print(f"\n{'='*60}")
    print(f"Total: {total} questões {'(dry run)' if args.dry_run else 'inseridas no banco'}")


if __name__ == "__main__":
    main()
