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


def extrair_cargos_html(soup) -> list[dict]:
    """
    Tenta extrair cargos individuais de uma tabela HTML em páginas de bancas.
    Procura a primeira tabela com coluna de cargo identificável.
    Retorna lista de {nome, vagas, salario, escolaridade} ou [] se não encontrar.
    """
    CARGO_KW = {"cargo", "função", "funcao", "denominação", "denominacao", "cargos"}
    VAGAS_KW = {"vagas", "vaga", "qtd", "quantidade"}
    SALARIO_KW = {"salário", "salario", "remuneração", "remuneracao", "vencimento", "r$"}
    ESCOLAR_KW = {"escolaridade", "nível", "nivel", "requisito", "formação", "formacao"}

    resultados = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        header_cells = rows[0].find_all(["th", "td"])
        headers = [limpar(c.get_text()).lower().replace(".", "").replace("°", "") for c in header_cells]
        if not headers:
            continue

        col_cargo = col_vagas = col_salario = col_escolar = None
        for i, h in enumerate(headers):
            if col_cargo is None and any(k in h for k in CARGO_KW):
                col_cargo = i
            if col_vagas is None and any(k in h for k in VAGAS_KW):
                col_vagas = i
            if col_salario is None and any(k in h for k in SALARIO_KW):
                col_salario = i
            if col_escolar is None and any(k in h for k in ESCOLAR_KW):
                col_escolar = i

        if col_cargo is None:
            continue

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if not cells or len(cells) <= col_cargo:
                continue
            nome = limpar(cells[col_cargo].get_text())
            if len(nome) < 3 or nome.lower() in {"total", "subtotal", "cargo", "função"}:
                continue

            def _cell(col):
                return limpar(cells[col].get_text()) if col is not None and len(cells) > col else None

            escolar_raw = (_cell(col_escolar) or "").lower()
            if "fundamental" in escolar_raw or "básic" in escolar_raw:
                escolaridade = "fundamental"
            elif "médio" in escolar_raw or "medio" in escolar_raw or "técnico" in escolar_raw:
                escolaridade = "medio"
            else:
                escolaridade = "superior"

            resultados.append({
                "nome": nome,
                "vagas": parse_vagas(_cell(col_vagas)),
                "salario": parse_salario(_cell(col_salario)),
                "escolaridade": escolaridade,
            })

        if resultados:
            break

    return resultados


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
