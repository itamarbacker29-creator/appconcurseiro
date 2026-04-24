import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import type { DocumentBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages/messages';

export const maxDuration = 60;

const BUCKET = 'apostilas';

function buildPrompt(titulo: string, materia: string): string {
  return (
    `Analise este PDF de apostila "${titulo}" sobre "${materia}" para concurso público.\n` +
    'Extraia os 15 conceitos mais importantes e crie flashcards de revisão.\n' +
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
    .createSignedUrl(material.url_storage, 600);

  if (!urlData?.signedUrl) {
    return NextResponse.json({ error: 'Falha ao acessar o arquivo.' }, { status: 500 });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'API de IA não configurada.' }, { status: 500 });

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

    const titulo = material.titulo ?? 'Apostila';
    const materia = material.materia ?? 'Concurso Público';

    const docBlock: DocumentBlockParam = {
      type: 'document',
      source: { type: 'url', url: urlData.signedUrl },
    };

    const textBlock: TextBlockParam = {
      type: 'text',
      text: buildPrompt(titulo, materia),
    };

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: [docBlock, textBlock] }],
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
    return NextResponse.json({ error: `Falha: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
