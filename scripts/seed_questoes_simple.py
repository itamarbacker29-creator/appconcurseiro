#!/usr/bin/env python3
"""
Seed sem dependências externas — usa urllib diretamente.
Funciona com qualquer Python 3.8+.

Uso: python scripts/seed_questoes_simple.py
"""

import json, os, re, time, sys, urllib.request, urllib.error
from pathlib import Path

# --- Carregar .env.local manualmente ---
env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            v = v.split('#')[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
SUPA_URL = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")).strip()
SUPA_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")).strip()

if not all([ANTHROPIC_KEY, SUPA_URL, SUPA_KEY]):
    print("Faltando variaveis: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY")
    sys.exit(1)

QUESTOES_POR_BATCH = 5

CURRICULO = {
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

NIVEIS = {1: "muito fácil", 2: "fácil", 3: "médio", 4: "difícil", 5: "muito difícil"}

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
    "explicacao": "explicação clara"
  }}
]

Requisitos:
- Questões originais
- Gabaritos variados
- Alternativas plausíveis
- Enunciados no estilo {banca}"""


def claude_request(prompt: str) -> str:
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["content"][0]["text"]


def supabase_count(materia: str, subtopico: str) -> int:
    url = (
        f"{SUPA_URL}/rest/v1/questoes"
        f"?materia=eq.{urllib.parse.quote(materia)}"
        f"&subtopico=eq.{urllib.parse.quote(subtopico)}"
        f"&select=id"
    )
    req = urllib.request.Request(url, headers={
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Prefer": "count=exact",
        "Range": "0-0",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            cr = r.headers.get("content-range", "0/0")
            return int(cr.split("/")[-1])
    except Exception:
        return 0


def supabase_insert(row: dict) -> bool:
    payload = json.dumps(row).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/questoes",
        data=payload,
        method="POST",
        headers={
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status in (200, 201)
    except urllib.error.HTTPError as e:
        print(f"\n    Erro HTTP {e.code}: {e.read().decode()[:200]}")
        return False


def gerar_batch(materia, subtopico, banca, nivel) -> list:
    prompt = PROMPT_BATCH.format(
        banca=banca, n=QUESTOES_POR_BATCH,
        subtopico=subtopico, materia=materia,
        nivel=nivel, nivel_label=NIVEIS[nivel],
    )
    for tentativa in range(3):
        try:
            texto = claude_request(prompt).strip()
            texto = re.sub(r'^```(?:json)?\s*', '', texto, flags=re.MULTILINE)
            texto = re.sub(r'\s*```\s*$', '', texto, flags=re.MULTILINE)
            questoes = json.loads(texto)
            if isinstance(questoes, list):
                return questoes
        except json.JSONDecodeError as e:
            print(f"\n    JSON invalido (tentativa {tentativa+1}): {e}")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                espera = 30 * (tentativa + 1)
                print(f"\n    Rate limit — aguardando {espera}s...")
                time.sleep(espera)
            else:
                print(f"\n    Erro HTTP {e.code}")
                return []
        except Exception as e:
            print(f"\n    Erro: {e}")
            return []
    return []


import urllib.parse

def main():
    total_geradas = total_salvas = 0
    total_subtopicos = sum(len(v["subtopicos"]) for v in CURRICULO.values())

    print(f"\n{'='*60}")
    print(f"  Seed — {QUESTOES_POR_BATCH} questoes por subtopico")
    print(f"  Estimativa: ~{total_subtopicos * QUESTOES_POR_BATCH} questoes em {total_subtopicos} subtopicos")
    print(f"{'='*60}\n")

    niveis_batch = [2, 2, 3, 3, 4][:QUESTOES_POR_BATCH]

    for materia, config in CURRICULO.items():
        banca = config["banca"]
        print(f"\n{materia}")

        for subtopico in config["subtopicos"]:
            count = supabase_count(materia, subtopico)
            if count >= QUESTOES_POR_BATCH:
                print(f"  [skip] {subtopico} ({count} ja existem)")
                continue

            print(f"  [gen]  {subtopico}...", end=" ", flush=True)
            questoes = gerar_batch(materia, subtopico, banca, nivel=3)
            total_geradas += len(questoes)

            salvos = 0
            for i, q in enumerate(questoes):
                nivel_q = niveis_batch[i] if i < len(niveis_batch) else 3
                enunciado = str(q.get("enunciado") or "").strip()
                opcoes = q.get("opcoes") or []
                gabarito = str(q.get("gabarito") or "").strip().upper()
                explicacao = str(q.get("explicacao") or "").strip() or None

                if not enunciado or len(opcoes) < 4 or not gabarito:
                    continue

                ok = supabase_insert({
                    "materia": materia,
                    "subtopico": subtopico,
                    "banca": banca,
                    "nivel": nivel_q,
                    "enunciado": enunciado,
                    "opcoes": opcoes,
                    "gabarito": gabarito,
                    "explicacao": explicacao,
                    "origem": "ia",
                    "ativo": True,
                })
                if ok:
                    salvos += 1

            total_salvas += salvos
            print(f"{salvos}/{len(questoes)} salvas")
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"  Concluido: {total_salvas}/{total_geradas} questoes salvas")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
