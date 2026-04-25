const UA = 'Mozilla/5.0 (compatible; OTutorBot/1.0)';

function extrairPdfs(html: string, base: string): string[] {
  return [...html.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)]
    .map(m => {
      const h = m[1];
      try { return h.startsWith('http') ? h : new URL(h, base).href; } catch { return null; }
    })
    .filter(Boolean) as string[];
}

async function _buscarPdf(url: string): Promise<string | null> {
  if (url.toLowerCase().endsWith('.pdf')) return url;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const html = await resp.text();

    const pdfs1 = extrairPdfs(html, url);
    if (pdfs1.length > 0) return pdfs1.find(p => /edital/i.test(p)) ?? pdfs1[0];

    const oficiais = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)]
      .map(m => m[1])
      .filter(h => /\.gov\.br|\.jus\.br|\.leg\.br|\.mp\.br|prefeitura|camara|tribunal/i.test(h))
      .slice(0, 5);

    for (const oficial of oficiais) {
      try {
        const r2 = await fetch(oficial, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!r2.ok) continue;
        const pdfs2 = extrairPdfs(await r2.text(), oficial);
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
