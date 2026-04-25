import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { GoogleGenAI } from '@google/genai';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  // Determina URL do PDF
  const pdfUrl = edital.link_edital_pdf || edital.link_inscricao || edital.link_fonte;
  if (!pdfUrl) return NextResponse.json({ error: 'sem_pdf' }, { status: 422 });

  // Baixa o PDF
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

  // Extrai matérias com Gemini
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const b64 = Buffer.from(pdfBytes).toString('base64');

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: b64 } },
            {
              text:
                'Analise este edital de concurso público e retorne APENAS um JSON:\n' +
                '{"materias": ["Português", "Direito Constitucional", "Raciocínio Lógico"]}\n' +
                'Liste TODAS as matérias cobradas na prova. Sem markdown, sem texto adicional.',
            },
          ],
        },
      ],
    });

    const texto = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
