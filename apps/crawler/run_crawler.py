"""
Crawler standalone — GitHub Actions v4.
RSS feeds + parser por regex. Zero dependência de IA.
"""
import asyncio, os, re
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

RSS_FEEDS = [
    "https://www.concursosnobrasil.com.br/feed/",
    "https://www.estrategiaconcursos.com.br/feed/",
    "https://www.gran.com.br/blog/feed/",
    "https://www.pciconcursos.com.br/rss/noticias.xml",
]

ESTADOS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]
KEYWORDS_CONCURSO = ["concurso", "edital", "seleção pública", "processo seletivo", "vagas"]
KEYWORDS_IGNORAR  = ["gabarito", "resultado", "apostila", "simulado", "curso", "dica", "como passar"]


def inferir_area(texto: str) -> str:
    t = texto.lower()
    if any(w in t for w in ["fiscal", "receita", "tributar", "fazenda", "sefaz"]): return "tributario"
    if any(w in t for w in ["policia", "policial", "segurança", "penitenci", "bombeiro"]): return "seguranca"
    if any(w in t for w in ["saúde", "enfermeiro", "médico", "hospital", "sus"]): return "saude"
    if any(w in t for w in ["professor", "educação", "escola", "pedagog"]): return "educacao"
    if any(w in t for w in ["juiz", "promotor", "tribunal", "judiciário", "trf", "tjm", "mpf"]): return "judiciario"
    return "administrativo"


def inferir_escolaridade(texto: str) -> str:
    t = texto.lower()
    if any(w in t for w in ["superior", "graduação", "analista", "auditor", "engenheiro", "advogado", "médico"]): return "superior"
    if any(w in t for w in ["médio", "técnico", "agente", "assistente"]): return "medio"
    return "medio"


def extrair_vagas(texto: str) -> int | None:
    m = re.search(r'(\d[\d\.,]*)\s*vaga', texto, re.IGNORECASE)
    if m:
        try: return int(re.sub(r'[.,]', '', m.group(1)))
        except: pass
    return None


def extrair_salario(texto: str) -> float | None:
    m = re.search(r'R\$\s*([\d\.,]+)', texto)
    if m:
        try: return float(re.sub(r'\.(?=\d{3})', '', m.group(1)).replace(',', '.'))
        except: pass
    return None


def extrair_estado(texto: str) -> str:
    for uf in ESTADOS:
        if re.search(rf'\b{uf}\b', texto): return uf
    for nome, uf in [("Federal","Nacional"),("Nacional","Nacional"),("São Paulo","SP"),("Rio de Janeiro","RJ"),("Minas Gerais","MG")]:
        if nome.lower() in texto.lower(): return uf
    return "Nacional"


def extrair_data(texto: str) -> str | None:
    # DD/MM/YYYY
    m = re.search(r'(\d{2})/(\d{2})/(\d{4})', texto)
    if m: return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None


def parsear_item(titulo: str, desc: str, link: str) -> dict | None:
    texto = f"{titulo} {desc}"

    # Filtra itens que não são sobre concursos
    if not any(k in texto.lower() for k in KEYWORDS_CONCURSO):
        return None
    if any(k in titulo.lower() for k in KEYWORDS_IGNORAR):
        return None

    # Tenta extrair orgao e cargo do título
    # Padrão comum: "Concurso ORGAO 2024: CARGO - X vagas"
    orgao, cargo = None, None

    # Padrão 1: "Concurso <orgao>: <cargo>"
    m = re.search(r'[Cc]oncurso\s+([^:]+?):\s*(.+?)(?:\s*[-–]\s*\d|\s*,|\s*$)', titulo)
    if m:
        orgao = m.group(1).strip()[:100]
        cargo = m.group(2).strip()[:150]

    # Padrão 2: "Edital <orgao> - <cargo>"
    if not orgao:
        m = re.search(r'[Ee]dital\s+([^-–]+?)\s*[-–]\s*(.+?)(?:\s*:\s*|\s*$)', titulo)
        if m:
            orgao = m.group(1).strip()[:100]
            cargo = m.group(2).strip()[:150]

    # Fallback: usa título inteiro como cargo e extrai orgao por sigla conhecida
    if not orgao:
        orgaos_conhecidos = ["IBGE","INSS","Receita Federal","Banco Central","BACEN","BB","CEF","Correios","STF","STJ","TST","TRF","MPF","PF","PRF","ANAC","ANVISA","SUSEP","CVM"]
        for o in orgaos_conhecidos:
            if o.lower() in texto.lower():
                orgao = o
                break

    if not orgao:
        orgao = titulo[:80]
    if not cargo:
        cargo = titulo[:150]

    return {
        "orgao": orgao,
        "cargo": cargo,
        "escolaridade": inferir_escolaridade(texto),
        "salario": extrair_salario(texto),
        "vagas": extrair_vagas(texto),
        "estado": extrair_estado(texto),
        "area": inferir_area(texto),
        "data_inscricao_inicio": extrair_data(desc[:500]) if desc else None,
        "data_inscricao_fim": None,
        "link_inscricao": link or "https://concursosnobrasil.com.br",
        "banca": None,
        "materias": [],
        "status": "ativo",
    }


async def buscar_e_salvar():
    print("[CRAWLER] v4 — RSS + regex, sem IA")
    headers = {"User-Agent": "ConcurseiroBot/1.0"}
    salvos = total = 0

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

                for item in items[:20]:
                    titulo_tag = item.find("title")
                    titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
                    desc_tag = item.find("description") or item.find("summary")
                    desc = BeautifulSoup(desc_tag.get_text(), "lxml").get_text(" ", strip=True) if desc_tag else ""
                    link_tag = item.find("link")
                    link = (link_tag.get_text(strip=True) if link_tag and link_tag.get_text(strip=True) else link_tag.get("href","") if link_tag else "")

                    total += 1
                    dados = parsear_item(titulo, desc, link)
                    if not dados:
                        continue

                    try:
                        r = supabase.table("editais").upsert(dados, on_conflict="orgao,cargo,data_inscricao_fim").execute()
                        if r.data:
                            salvos += 1
                            print(f"  ✓ {dados['orgao']} — {dados['cargo']}")
                    except Exception as e:
                        print(f"  ✗ {e}")

            except Exception as e:
                print(f"[RSS] Erro em {url}: {e}")

    print(f"\n[CRAWLER] Concluído: {salvos} editais salvos de {total} processados.")


if __name__ == "__main__":
    asyncio.run(buscar_e_salvar())
