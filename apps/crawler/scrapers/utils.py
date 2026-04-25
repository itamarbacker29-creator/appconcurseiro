"""Utilitários compartilhados entre scrapers."""
import re
from datetime import date, datetime
from urllib.parse import urljoin

UA = "Mozilla/5.0 (compatible; OTutorCrawler/1.0)"
HEADERS = {"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"}
HOJE = date.today().isoformat()


def limpar(texto: str | None) -> str:
    if not texto:
        return ""
    return " ".join(texto.split()).strip()


def parse_data_br(texto: str | None) -> str | None:
    """Converte 'DD/MM/YYYY' ou 'DD/MM/YY' para 'YYYY-MM-DD'."""
    if not texto:
        return None
    m = re.search(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})", texto)
    if not m:
        return None
    d, mo, y = m.group(1), m.group(2), m.group(3)
    if len(y) == 2:
        y = "20" + y
    try:
        dt = datetime(int(y), int(mo), int(d))
        return dt.date().isoformat()
    except ValueError:
        return None


def parse_salario(texto: str | None) -> float | None:
    if not texto:
        return None
    m = re.search(r"R\$\s*([\d.,]+)", texto.replace("\xa0", " "))
    if not m:
        return None
    try:
        return float(m.group(1).replace(".", "").replace(",", "."))
    except ValueError:
        return None


def parse_vagas(texto: str | None) -> int | None:
    if not texto:
        return None
    m = re.search(r"(\d[\d.]*)", texto.replace(".", ""))
    if not m:
        return None
    try:
        return int(m.group(1).replace(".", ""))
    except ValueError:
        return None


def href_abs(href: str, base: str) -> str:
    if href.startswith("http"):
        return href
    return urljoin(base, href)


def encerrado(data_fim: str | None) -> bool:
    if not data_fim:
        return False
    try:
        return data_fim < HOJE
    except Exception:
        return False


def inferir_nivel(orgao: str) -> str:
    o = orgao.lower()
    if any(p in o for p in ["prefeitura", "município", "municipal", "câmara municipal"]):
        return "municipal"
    if any(p in o for p in ["governo do estado", "secretaria de estado", "assembleia legislativa",
                              "tribunal de justiça", "mp", "ministério público do estado"]):
        return "estadual"
    return "federal"


def inferir_estado(texto: str) -> str:
    SIGLAS = {
        "acre": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM",
        "bahia": "BA", "ceará": "CE", "distrito federal": "DF",
        "espírito santo": "ES", "goiás": "GO", "maranhão": "MA",
        "mato grosso do sul": "MS", "mato grosso": "MT", "minas gerais": "MG",
        "pará": "PA", "paraíba": "PB", "paraná": "PR", "pernambuco": "PE",
        "piauí": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
        "rio grande do sul": "RS", "rondônia": "RO", "roraima": "RR",
        "santa catarina": "SC", "são paulo": "SP", "sergipe": "SE",
        "tocantins": "TO",
    }
    t = texto.lower()
    for nome, sigla in SIGLAS.items():
        if nome in t:
            return sigla
    # Busca sigla diretamente (ex: "- SP", "/RJ")
    m = re.search(r"\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MS|MT|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b", texto.upper())
    if m:
        return m.group(1)
    return "Nacional"
