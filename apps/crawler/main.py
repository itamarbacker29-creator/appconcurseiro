from fastapi import FastAPI, BackgroundTasks, Header, HTTPException
from scrapers.pci_concursos import scrape_pci
from scrapers.diario_oficial import scrape_do
from parser.edital_parser import parsear_edital
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Crawler de Editais")
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

CRAWLER_SECRET = os.getenv("CRAWLER_SECRET", "")


def verificar_token(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    if token != CRAWLER_SECRET:
        raise HTTPException(status_code=401, detail="Token inválido")


@app.post("/crawler/rodar")
async def rodar_crawler(
    background_tasks: BackgroundTasks,
    authorization: str = Header(...)
):
    verificar_token(authorization)
    background_tasks.add_task(executar_pipeline)
    return {"status": "iniciado", "message": "Pipeline rodando em background"}


async def executar_pipeline():
    print("[CRAWLER] Iniciando pipeline...")
    fontes = [scrape_pci, scrape_do]
    total_novos = 0

    for scraper in fontes:
        try:
            editais_brutos = await scraper()
            for edital_texto in editais_brutos:
                dados = await parsear_edital(edital_texto)
                if dados and dados.get("orgao") and dados.get("cargo"):
                    resultado = (
                        supabase.table("editais")
                        .upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim")
                        .execute()
                    )
                    if resultado.data:
                        total_novos += 1
                        await enviar_notificacoes(dados)
        except Exception as e:
            print(f"[CRAWLER] Erro no scraper {scraper.__name__}: {e}")

    print(f"[CRAWLER] Pipeline concluído. {total_novos} editais processados.")


async def enviar_notificacoes(edital: dict):
    """Envia push notification para usuários com perfil compatível."""
    try:
        # Buscar usuários com push_subscription e com o estado/área compatível
        resultado = supabase.table("profiles").select(
            "id, push_subscription, areas_interesse, estados_interesse"
        ).not_.is_("push_subscription", "null").execute()

        for profile in resultado.data or []:
            subscription = profile.get("push_subscription")
            if not subscription:
                continue

            areas = profile.get("areas_interesse") or []
            estados = profile.get("estados_interesse") or []

            area_match = not areas or any(a.lower() in (edital.get("area") or "").lower() for a in areas)
            estado_match = not estados or edital.get("estado") in estados or "Nacional" in estados

            if area_match and estado_match:
                # Chamar endpoint interno de push
                import httpx
                app_url = os.getenv("NEXT_PUBLIC_APP_URL", "")
                if app_url:
                    prazo = edital.get("data_inscricao_fim", "")
                    await httpx.AsyncClient().post(
                        f"{app_url}/api/push/notificar",
                        json={
                            "userId": profile["id"],
                            "titulo": f"Novo edital: {edital.get('orgao')}",
                            "corpo": f"{edital.get('cargo')} — {edital.get('vagas', '?')} vagas. Inscrições até {prazo}.",
                            "url": "/editais",
                        }
                    )
    except Exception as e:
        print(f"[NOTIFICACAO] Erro: {e}")


@app.get("/health")
def health():
    return {"ok": True, "service": "crawler-editais"}
