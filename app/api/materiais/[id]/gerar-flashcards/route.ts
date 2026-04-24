import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';

export const maxDuration = 60;

const BUCKET = 'apostilas';
const MAX_CHARS = 5000; // ~1250 tokens — barato e suficiente para 15 flashcards

function buildPrompt(titulo: string, materia: string, texto: string): string {
  return (
    `Material: "${titulo}" — ${materia} (concurso público)\n\n` +
    `TRECHO DO CONTEÚDO:\n${texto}\n\n` +
    'Com base nesse conteúdo, crie até 15 flashcards de revisão.\n' +
    'Retorne APENAS um array JSON válido, sem markdown:\n' +
    '[\n' +
    '  {\n' +
    '    "frente": "Pergunta objetiva ou conceito-chave (máx 120 chars)",\n' +
    '    "verso": "Resposta completa para uma prova (máx 400 chars)",\n' +
    `    "materia": "${materia}"\n` +
    '  }\n' +
    ']\n' +
    'Foque em definições, princípios, requisitos e regras práticas.'
  );
}

async function extrairTexto(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = ''; // desativa worker — roda na thread principal (serverless)

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableStream: true,
  }).promise;

  const numPages = Math.min(3, pdf.numPages);
  let text = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item) text += item.str + ' ';
    }
    text += '\n';
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: material } = await supabase
    .from('materiais')
    .select('id, titulo, materia, url_storage')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!material?.url_storage) {
    return NextResponse.json({ error: 'Material não encontrado.' }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const { data: urlData } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(material.url_storage, 300);

  if (!urlData?.signedUrl) {
    return NextResponse.json({ error: 'Falha ao acessar o arquivo.' }, { status: 500 });
  }

  const pdfResp = await fetch(urlData.signedUrl);
  if (!pdfResp.ok) return NextResponse.json({ error: 'Falha ao baixar o PDF.' }, { status: 500 });
  const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());

  let textoExtraido: string;
  try {
    textoExtraido = await extrairTexto(pdfBuffer);
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler o texto do PDF.' }, { status: 422 });
  }

  if (!textoExtraido || textoExtraido.length < 50) {
    return NextResponse.json({ error: 'PDF sem texto legível (pode ser imagem escaneada).' }, { status: 422 });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'API de IA não configurada.' }, { status: 500 });

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

    const titulo = material.titulo ?? 'Apostila';
    const materia = material.materia ?? 'Concurso Público';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: buildPrompt(titulo, materia, textoExtraido),
      }],
    });

    const raw = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start < 0 || end < 0) {
      return NextResponse.json({ error: 'IA não retornou flashcards válidos.' }, { status: 500 });
    }

    const flashcards = JSON.parse(cleaned.slice(start, end + 1)) as { frente: string; verso: string; materia: string }[];
    return NextResponse.json({ flashcards });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[gerar-flashcards]', msg);
    return NextResponse.json({ error: `Falha ao gerar flashcards: ${msg.slice(0, 120)}` }, { status: 500 });
  }
}
