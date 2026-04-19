import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { IDENTIDADE } from '@/config/identidade';

const FONTES_PERMITIDAS = ['lexml.gov.br', 'planalto.gov.br', 'stf.jus.br', 'stj.jus.br'];

function extrairArtigo(html: string, hash: string): string {
  // Remove scripts, styles e tags de navegação
  const limpo = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000); // Limitar tamanho

  if (hash) {
    const artId = hash.replace('#', '');
    const idx = limpo.toLowerCase().indexOf(artId.toLowerCase());
    if (idx > -1) return limpo.slice(Math.max(0, idx - 100), idx + 1000);
  }

  return limpo;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ erro: 'URL obrigatória' }, { status: 400 });

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return NextResponse.json({ erro: 'URL inválida' }, { status: 400 });
  }

  if (!FONTES_PERMITIDAS.some(f => urlObj.hostname === f || urlObj.hostname.endsWith(`.${f}`))) {
    return NextResponse.json({ erro: 'Fonte não permitida' }, { status: 403 });
  }

  const cacheKey = `lei:${Buffer.from(url).toString('base64').slice(0, 60)}`;

  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) return NextResponse.json({ texto: cached });
  } catch {
    // Redis offline — continuar sem cache
  }

  try {
    const resposta = await fetch(url, {
      headers: {
        'User-Agent': `${IDENTIDADE.nomeApp}/1.0 (${IDENTIDADE.dominioPrincipal})`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const html = await resposta.text();
    const texto = extrairArtigo(html, urlObj.hash);

    // Cache por 7 dias
    try {
      await redis.setex(cacheKey, 60 * 60 * 24 * 7, texto);
    } catch { /* sem cache */ }

    return NextResponse.json({ texto });
  } catch (err) {
    console.error('Erro ao buscar legislação:', err);
    return NextResponse.json({ erro: 'Falha ao buscar dispositivo legal' }, { status: 502 });
  }
}
