const UA = 'Mozilla/5.0 (compatible; OTutorBot/1.0)';

// Domínios de portais de notícias/blogs — NÃO seguir como fonte oficial
const DOMINIOS_NOTICIAS = [
  'estrategiaconcursos', 'grancursosonline', 'tecconcursos', 'qconcursos',
  'concursosnobrasil', 'pciconcursos', 'apostilas', 'folha', 'uol.com.br',
  'g1.globo', 'r7.com', 'terra.com', 'yahoo.com', 'bing.com', 'google.com',
  'facebook.com', 'instagram.com', 'youtube.com', 'twitter.com',
];

function ehBlog(url: string): boolean {
  const h = new URL(url).hostname.toLowerCase();
  return DOMINIOS_NOTICIAS.some(d => h.includes(d));
}

function extrairPdfs(html: string, base: string): string[] {
  return [...html.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)]
    .map(m => {
      const h = m[1];
      try { return h.startsWith('http') ? h : new URL(h, base).href; } catch { return null; }
    })
    .filter(Boolean) as string[];
}

function extrairLinksExternos(html: string, baseHost: string): string[] {
  return [...html.matchAll(/href="(https?:\/\/[^"#?]+)"/gi)]
    .map(m => m[1])
    .filter(href => {
      try {
        const h = new URL(href).hostname.toLowerCase();
        return h !== baseHost && !ehBlog(href);
      } catch { return false; }
    });
}

async function _buscarPdf(url: string): Promise<string | null> {
  if (url.toLowerCase().endsWith('.pdf')) return url;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Nível 1: PDFs diretos na página
    const pdfs1 = extrairPdfs(html, url);
    if (pdfs1.length > 0) return pdfs1.find(p => /edital/i.test(p)) ?? pdfs1[0];

    // Nível 2: segue links externos (bancas, portais oficiais, prefeituras...)
    const baseHost = new URL(url).hostname.toLowerCase();
    const externos = extrairLinksExternos(html, baseHost);

    // Prioriza links com palavras-chave relevantes
    const priorizados = [
      ...externos.filter(h => /concurso|edital|selec|inscri|fcc|cebraspe|vunesp|ibfc|aocp|quadrix|iades|ibam|cesgranrio|esaf|fgv|funrio|legalle/i.test(h)),
      ...externos.filter(h => /\.gov\.br|\.org\.br|\.jus\.br|\.leg\.br|\.mp\.br|\.def\.br/i.test(h)),
      ...externos,
    ];

    const vistos = new Set<string>();
    for (const externo of priorizados.slice(0, 8)) {
      if (vistos.has(externo)) continue;
      vistos.add(externo);
      try {
        const r2 = await fetch(externo, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!r2.ok) continue;
        const html2 = await r2.text();
        const pdfs2 = extrairPdfs(html2, externo);
        if (pdfs2.length > 0) return pdfs2.find(p => /edital/i.test(p)) ?? pdfs2[0];
      } catch { /* continua */ }
    }
  } catch { /* continua */ }
  return null;
}

export async function encontrarPdfUrl(
  ...links: (string | null | undefined)[]
): Promise<string | null> {
  for (const url of links.filter(Boolean) as string[]) {
    const pdf = await _buscarPdf(url);
    if (pdf) return pdf;
  }
  return null;
}

export async function baixarPdf(url: string, maxBytes = 15_000_000): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!resp.ok) return null;
    const bytes = await resp.arrayBuffer();
    return bytes.byteLength > maxBytes ? null : bytes;
  } catch { return null; }
}
