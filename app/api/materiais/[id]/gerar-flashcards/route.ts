import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';

export const maxDuration = 120;

const BUCKET = 'apostilas';

function buildPrompt(titulo: string, materia: string): string {
  return (
    `Analise este PDF de apostila/material de estudo "${titulo}" sobre "${materia}" para concurso público.\n` +
    'Extraia os 15 conceitos mais importantes e crie flashcards de revisão.\n' +
    'Retorne APENAS um array JSON válido, sem markdown:\n' +
    '[\n' +
    '  {\n' +
    '    "frente": "Pergunta objetiva ou conceito-chave",\n' +
    '    "verso": "Resposta completa e clara",\n' +
    `    "materia": "${materia}"\n` +
    '  }\n' +
    ']\n\n' +
    'Regras:\n' +
    '- Frente: pergunta direta ou termo técnico (máx 120 caracteres)\n' +
    '- Verso: resposta que um candidato precisaria numa prova (máx 400 caracteres)\n' +
    '- Foque em definições legais, princípios, conceitos e regras práticas\n' +
    '- Prefira "O que é X?", "Quais os requisitos de Y?" ao invés de sim/não'
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
    .createSignedUrl(material.url_storage, 300);

  if (!urlData?.signedUrl) {
    return NextResponse.json({ error: 'Falha ao acessar o arquivo.' }, { status: 500 });
  }

  const pdfResp = await fetch(urlData.signedUrl);
  if (!pdfResp.ok) return NextResponse.json({ error: 'Falha ao baixar o PDF.' }, { status: 500 });
  const pdfBase64 = Buffer.from(await pdfResp.arrayBuffer()).toString('base64');

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const titulo = material.titulo ?? 'Apostila';
    const materia = material.materia ?? 'Concurso Público';

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            { text: buildPrompt(titulo, materia) },
          ],
        },
      ],
    });

    const raw = (response.text ?? '').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start < 0 || end < 0) {
      return NextResponse.json({ error: 'Gemini não retornou flashcards válidos.' }, { status: 500 });
    }

    const flashcards = JSON.parse(cleaned.slice(start, end + 1)) as { frente: string; verso: string; materia: string }[];
    return NextResponse.json({ flashcards });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[gerar-flashcards]', msg);
    return NextResponse.json({ error: 'Falha ao gerar flashcards.' }, { status: 500 });
  }
}
