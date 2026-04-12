"""
Script standalone para rodar o crawler via GitHub Actions.
Sem FastAPI — executa o pipeline diretamente.
"""
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

from parser.edital_parser import parsear_edital
from scrapers.pci_concursos import scrape_pci
from scrapers.diario_oficial import scrape_do


async def main():
    print("[CRAWLER] Iniciando pipeline...")
    fontes = [scrape_pci, scrape_do]
    total_novos = 0
    total_erros = 0

    for scraper in fontes:
        nome = scraper.__name__
        try:
            print(f"[CRAWLER] Rodando {nome}...")
            editais_brutos = await scraper()
            print(f"[CRAWLER] {nome} retornou {len(editais_brutos)} textos")

            for edital_texto in editais_brutos:
                dados = await parsear_edital(edital_texto)
                if not dados:
                    continue
                if not dados.get("orgao") or not dados.get("cargo"):
                    continue
                if not dados.get("link_inscricao"):
                    dados["link_inscricao"] = "https://pciconcursos.com.br"

                try:
                    resultado = (
                        supabase.table("editais")
                        .upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim")
                        .execute()
                    )
                    if resultado.data:
                        total_novos += 1
                        print(f"  ✓ {dados['orgao']} — {dados['cargo']}")
                except Exception as e:
                    print(f"  ✗ Erro ao salvar edital: {e}")
                    total_erros += 1

        except Exception as e:
            print(f"[CRAWLER] Erro no scraper {nome}: {e}")
            total_erros += 1

    print(f"\n[CRAWLER] Concluído: {total_novos} editais salvos, {total_erros} erros.")


if __name__ == "__main__":
    asyncio.run(main())
