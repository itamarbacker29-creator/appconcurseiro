import google.generativeai as genai
import json
import os
from typing import Optional

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

PROMPT_PARSER = """Você é um extrator de dados de editais de concursos públicos brasileiros.
Extraia do texto abaixo as seguintes informações em JSON:

{
  "orgao": "nome do órgão (ex: Receita Federal)",
  "cargo": "nome do cargo",
  "escolaridade": "fundamental|medio|superior",
  "salario": 0000.00,
  "vagas": 000,
  "estado": "XX ou Nacional",
  "area": "tributario|seguranca|saude|educacao|administrativo|judiciario|outros",
  "data_inscricao_inicio": "YYYY-MM-DD",
  "data_inscricao_fim": "YYYY-MM-DD",
  "link_inscricao": "url oficial se mencionada",
  "banca": "nome da banca ou null",
  "materias": ["Matéria 1", "Matéria 2"],
  "status": "ativo"
}

Retorne APENAS o JSON, sem markdown, sem explicações.
Se algum campo não for encontrado, use null.

TEXTO DO EDITAL:
{texto}"""


async def parsear_edital(texto: str) -> Optional[dict]:
    try:
        resposta = model.generate_content(
            PROMPT_PARSER.replace("{texto}", texto[:4000])
        )
        raw = resposta.text.strip()
        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "").strip()
        dados = json.loads(raw)
        return dados
    except json.JSONDecodeError as e:
        print(f"[PARSER] JSON inválido: {e}")
        return None
    except Exception as e:
        print(f"[PARSER] Erro: {e}")
        return None
