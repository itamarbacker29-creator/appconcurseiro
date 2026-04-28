import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const supabase = createAdminClient();

  const { data: edital } = await supabase
    .from('editais')
    .select('id, link_edital_pdf, link_inscricao, link_fonte, materias')
    .eq('id', id)
    .single();

  if (!edital) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (edital.materias?.length > 0) {
    return NextResponse.json({ materias: edital.materias });
  }

  const linkCandidatos = [edital.link_edital_pdf, edital.link_inscricao, edital.link_fonte].filter(Boolean) as string[];
  if (linkCandidatos.length === 0) return NextResponse.json({ error: 'sem_pdf' }, { status: 422 });

  async function encontrarPdf(url: string): Promise<string | null> {
    if (url.toLowerCase().endsWith('.pdf')) return url;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OTutorBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return null;
      const html = await resp.text();
      // Nível 1: PDFs diretos
      const pdfs = [...html.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m => {
        const h = m[1];
        return h.startsWith('http') ? h : new URL(h, url).href;
      });
      if (pdfs.length > 0) {
        const editalPdf = pdfs.find(p => /edital/i.test(p));
        return editalPdf ?? pdfs[0];
      }
      // Nível 2: links para domínios oficiais
      const oficiais = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)]
        .map(m => m[1])
        .filter(h => /\.gov\.br|\.jus\.br|\.leg\.br|\.mp\.br|prefeitura|camara|tribunal/i.test(h))
        .slice(0, 5);
      for (const oficial of oficiais) {
        const r2 = await fetch(oficial, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OTutorBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!r2.ok) continue;
        const html2 = await r2.text();
        const pdfs2 = [...html2.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m => {
          const h = m[1];
          return h.startsWith('http') ? h : new URL(h, oficial).href;
        });
        if (pdfs2.length > 0) {
          const editalPdf2 = pdfs2.find(p => /edital/i.test(p));
          return editalPdf2 ?? pdfs2[0];
        }
      }
    } catch { /* continua para próximo candidato */ }
    return null;
  }

  let pdfUrl: string | null = null;
  for (const candidato of linkCandidatos) {
    pdfUrl = await encontrarPdf(candidato);
    if (pdfUrl) break;
  }
  if (!pdfUrl) return NextResponse.json({ error: 'sem_pdf' }, { status: 422 });

  let pdfBytes: ArrayBuffer;
  try {
    const resp = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OTutorBot/1.0)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    pdfBytes = await resp.arrayBuffer();
    if (pdfBytes.byteLength > 15_000_000) {
      return NextResponse.json({ error: 'pdf_grande' }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: 'download_falhou' }, { status: 422 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const b64 = Buffer.from(pdfBytes).toString('base64');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: b64 },
            },
            {
              type: 'text',
              text:
                'Analise este edital de concurso público e retorne APENAS um JSON:\n' +
                '{"materias": ["Português", "Direito Constitucional", "Raciocínio Lógico"]}\n' +
                'Liste TODAS as matérias cobradas na prova. Sem markdown, sem texto adicional.',
            },
          ],
        },
      ],
    });

    const texto = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON não encontrado');

    const parsed = JSON.parse(match[0]);
    const materias: string[] = (parsed.materias ?? [])
      .map((m: unknown) => String(m).trim())
      .filter(Boolean)
      .slice(0, 40);

    if (materias.length === 0) throw new Error('nenhuma matéria extraída');

    await supabase
      .from('editais')
      .update({ materias, pdf_processado: true })
      .eq('id', id);

    return NextResponse.json({ materias });
  } catch (e) {
    console.error('[extrair-materias]', e);
    return NextResponse.json({ error: 'extracao_falhou' }, { status: 500 });
  }
}
