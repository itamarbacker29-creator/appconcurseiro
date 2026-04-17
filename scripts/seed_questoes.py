#!/usr/bin/env python3
"""
Seed do banco de questões — gera batches por matéria/subtópico via Claude Haiku.
Produz ~350 questões cobrindo o currículo completo dos principais concursos federais.

Uso:
  pip install anthropic supabase python-dotenv
  python scripts/seed_questoes.py

Variáveis de ambiente necessárias (no .env.local da raiz ou como env vars):
  ANTHROPIC_API_KEY
  NEXT_PUBLIC_SUPABASE_URL  (ou SUPABASE_URL)
  SUPABASE_SERVICE_KEY      (ou SUPABASE_SERVICE_ROLE_KEY)
"""

import asyncio, json, os, re, time, sys
from pathlib import Path
from dotenv import load_dotenv

# Carrega .env.local da raiz do projeto
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

import anthropic
from supabase import create_client

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
SUPA_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPA_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not all([ANTHROPIC_KEY, SUPA_URL, SUPA_KEY]):
    print("❌  Variáveis de ambiente ausentes. Configure ANTHROPIC_API_KEY, SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    sys.exit(1)

claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
supabase = create_client(SUPA_URL, SUPA_KEY)

QUESTOES_POR_BATCH = 5  # questões por subtópico — ajuste para gerar mais ou menos

# Currículo completo baseado nos editais mais comuns (CESPE/CEBRASPE)
CURRICULO: dict[str, dict] = {
    "Direito Administrativo": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Princípios da Administração Pública (LIMPE)",
            "Ato Administrativo — conceito, elementos e atributos",
            "Licitação — modalidades e procedimento",
            "Contratos Administrativos",
            "Poderes da Administração Pública",
            "Agentes Públicos — cargo, emprego e função",
            "Responsabilidade Civil do Estado",
            "Controle da Administração Pública",
            "Serviços Públicos",
            "Bens Públicos",
        ],
    },
    "Direito Constitucional": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Princípios Fundamentais da República",
            "Direitos e Garantias Fundamentais",
            "Direitos Sociais",
            "Organização do Estado — União, Estados e Municípios",
            "Poder Legislativo e Processo Legislativo",
            "Poder Executivo",
            "Poder Judiciário",
            "Administração Pública na Constituição",
            "Controle de Constitucionalidade",
            "Ordem Econômica e Financeira",
        ],
    },
    "Português": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Interpretação e Compreensão de Texto",
            "Ortografia — uso do hífen, maiúsculas, grafia",
            "Acentuação Gráfica",
            "Concordância Verbal",
            "Concordância Nominal",
            "Regência Verbal e Nominal",
            "Colocação Pronominal",
            "Pontuação — vírgula, ponto e vírgula, dois-pontos",
            "Figuras de Linguagem e Estilística",
            "Coesão e Coerência Textual",
        ],
    },
    "Raciocínio Lógico": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Proposições e Conectivos Lógicos",
            "Tabelas-Verdade e Tautologia",
            "Negação de Proposições",
            "Inferências e Silogismos",
            "Lógica de Predicados",
            "Sequências Numéricas e Figurativas",
            "Raciocínio Analítico — arranjos e diagramas",
        ],
    },
    "Direito Penal": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Princípios do Direito Penal",
            "Aplicação da Lei Penal no Tempo e no Espaço",
            "Fato Típico — conduta, resultado, nexo causal, tipicidade",
            "Ilicitude e Culpabilidade",
            "Iter Criminis — tentativa e consumação",
            "Concurso de Crimes e de Pessoas",
            "Penas — espécies, cominação e aplicação",
        ],
    },
    "Informática": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Hardware — componentes e periféricos",
            "Sistemas Operacionais Windows e Linux",
            "Microsoft Office — Word, Excel, PowerPoint",
            "Internet e Segurança da Informação",
            "Redes de Computadores — conceitos e protocolos",
            "Banco de Dados — conceitos básicos e SQL",
        ],
    },
    "Matemática Financeira": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Juros Simples",
            "Juros Compostos",
            "Desconto Simples e Composto",
            "Séries de Pagamentos — anuidades",
            "Porcentagem e Variações",
            "Razão, Proporção e Regra de Três",
        ],
    },
    "Legislação Específica": {
        "banca": "CESPE/CEBRASPE",
        "subtopicos": [
            "Lei 8.112/1990 — Regime Jurídico dos Servidores Federais",
            "Lei 8.429/1992 — Improbidade Administrativa",
            "Lei 14.133/2021 — Nova Lei de Licitações",
            "Lei 9.784/1999 — Processo Administrativo Federal",
            "Decreto-Lei 200/1967 — Organização da Administração Federal",
        ],
    },
}

PROMPT_BATCH = """Você é um especialista em concursos públicos brasileiros com vasta experiência nas provas da banca {banca}.

Gere exatamente {n} questões de múltipla escolha sobre "{subtopico}" dentro da matéria "{materia}".
Nível de dificuldade: {nivel}/5 ({nivel_label}).
Siga o estilo de redação e nível de complexidade da banca {banca}.

Retorne APENAS um array JSON válido, sem markdown, sem texto antes ou depois:
[
  {{
    "enunciado": "texto completo da questão, pode incluir contexto/excerto quando pertinente",
    "opcoes": [
      {{"letra": "A", "texto": "alternativa A"}},
      {{"letra": "B", "texto": "alternativa B"}},
      {{"letra": "C", "texto": "alternativa C"}},
      {{"letra": "D", "texto": "alternativa D"}},
      {{"letra": "E", "texto": "alternativa E"}}
    ],
    "gabarito": "C",
    "explicacao": "explicação clara do porquê a alternativa correta está certa e por que as demais estão erradas"
  }}
]

Requisitos:
- Questões originais, não copie questões reais de outras fontes
- Gabaritos variados — não concentre tudo em A ou B
- Alternativas plausíveis (distratores bem construídos)
- Enunciados claros e objetivos, no estilo {banca}"""

NIVEIS = {1: "muito fácil", 2: "fácil", 3: "médio", 4: "difícil", 5: "muito difícil"}


def gerar_batch(materia: str, subtopico: str, banca: str, nivel: int) -> list[dict]:
    prompt = PROMPT_BATCH.format(
        banca=banca,
        n=QUESTOES_POR_BATCH,
        subtopico=subtopico,
        materia=materia,
        nivel=nivel,
        nivel_label=NIVEIS[nivel],
    )

    for tentativa in range(3):
        try:
            response = claude.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            texto = response.content[0].text.strip()
            texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
            texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
            questoes = json.loads(texto)
            if isinstance(questoes, list):
                return questoes
            return []
        except json.JSONDecodeError as e:
            print(f"    ⚠  JSON inválido (tentativa {tentativa+1}): {e}")
        except anthropic.RateLimitError:
            espera = 30 * (tentativa + 1)
            print(f"    ⏳  Rate limit — aguardando {espera}s...")
            time.sleep(espera)
        except Exception as e:
            print(f"    ❌  Erro: {e}")
            return []

    return []


def salvar_questoes(questoes: list[dict], materia: str, subtopico: str, banca: str, nivel: int) -> int:
    salvos = 0
    for q in questoes:
        enunciado = str(q.get("enunciado") or "").strip()
        opcoes = q.get("opcoes") or []
        gabarito = str(q.get("gabarito") or "").strip().upper()
        explicacao = str(q.get("explicacao") or "").strip() or None

        if not enunciado or len(opcoes) < 4 or not gabarito:
            continue

        try:
            r = supabase.table("questoes").insert({
                "materia": materia,
                "subtopico": subtopico,
                "banca": banca,
                "nivel": nivel,
                "enunciado": enunciado,
                "opcoes": opcoes,
                "gabarito": gabarito,
                "explicacao": explicacao,
                "origem": "ia",
                "ativo": True,
            }).execute()
            if r.data:
                salvos += 1
        except Exception as e:
            print(f"    ✗ Erro ao salvar: {e}")

    return salvos


def main():
    total_geradas = 0
    total_salvas = 0

    print(f"\n{'='*60}")
    print(f"  Seed de questões — {QUESTOES_POR_BATCH} por subtópico")
    print(f"  Total estimado: ~{sum(len(v['subtopicos']) for v in CURRICULO.values()) * QUESTOES_POR_BATCH} questões")
    print(f"{'='*60}\n")

    for materia, config in CURRICULO.items():
        banca = config["banca"]
        subtopicos = config["subtopicos"]
        print(f"\n📚  {materia} ({banca})")

        for subtopico in subtopicos:
            # Verifica se já existe questão para esse subtópico
            existing = supabase.table("questoes") \
                .select("id", count="exact") \
                .eq("materia", materia) \
                .eq("subtopico", subtopico) \
                .execute()
            count = existing.count or 0

            if count >= QUESTOES_POR_BATCH:
                print(f"  ⏭  {subtopico} — já tem {count} questões, pulando")
                continue

            # Mistura níveis: 2 fáceis, 2 médias, 1 difícil por subtópico
            niveis_batch = [2, 2, 3, 3, 4][:QUESTOES_POR_BATCH]
            nivel_principal = 3  # médio como padrão para o batch único

            print(f"  ⚙  {subtopico}...", end=" ", flush=True)
            questoes = gerar_batch(materia, subtopico, banca, nivel_principal)
            total_geradas += len(questoes)

            if questoes:
                # Distribui os níveis pelas questões geradas
                for i, q in enumerate(questoes):
                    q["_nivel"] = niveis_batch[i] if i < len(niveis_batch) else 3

                salvos = 0
                for q in questoes:
                    nivel_q = q.pop("_nivel", 3)
                    salvos += salvar_questoes([q], materia, subtopico, banca, nivel_q)

                total_salvas += salvos
                print(f"✓ {salvos}/{len(questoes)} salvas")
            else:
                print("✗ falhou")

            time.sleep(1)  # pequena pausa entre batches

    print(f"\n{'='*60}")
    print(f"  ✅  Concluído: {total_salvas}/{total_geradas} questões salvas")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
