import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { encontrarPdfUrl, baixarPdf } from '@/lib/pdf-utils';

export const maxDuration = 60;

const AREAS = ['tributario','seguranca','saude','educacao','judiciario','tecnologia','administrativo'] as const;

const PROMPT = `Analise este edital de concurso público e retorne APENAS este JSON:
{
  "banca": "nome da banca organizadora ou null",
  "link_inscricao": "URL oficial de inscrição (portal do órgão, não blog) ou null",
  "data_inscricao_inicio": "YYYY-MM-DD ou null",
  "data_inscricao_fim": "YYYY-MM-DD ou null",
  "cargos": [
    {
      "nome": "nome exato do cargo conforme edital",
      "materias": ["Matéria 1", "Matéria 2"],
      "salario": 0000.00,
      "vagas": 0,
      "formacao_exigida": ["Direito"],
      "registro_conselho_exigido": ["OAB"],
      "local_prova": ["Cidade"],
      "data_prova": "YYYY-MM-DD ou null",
      "escolaridade": "fundamental|medio|superior",
      "area": "tributario|seguranca|saude|educacao|judiciario|tecnologia|administrativo",
      "cotas": {"pcd": 5, "racial": 20, "indigena": null, "quilombola": null},
      "etapas": ["Prova objetiva", "Prova discursiva"]
    }
  ]
}
Liste TODOS os cargos individualmente com suas matérias específicas. Use null para campos ausentes, [] para listas vazias. Sem markdown.`;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: edital } = await supabase
    .from('editais')
    .select('id, link_edital_pdf, link_inscricao, link_fonte')
    .eq('id', id)
    .single();

  if (!edital) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Retorna cargos já extraídos
  const { data: existentes } = await supabase
    .from('cargos')
    .select('*')
    .eq('edital_id', id);

  if (existentes && existentes.length > 0) {
    return NextResponse.json({ cargos: existentes });
  }

  const pdfUrl = await encontrarPdfUrl(edital.link_edital_pdf, edital.link_inscricao, edital.link_fonte);
  if (!pdfUrl) return NextResponse.json({ error: 'sem_pdf' }, { status: 422 });

  const pdfBytes = await baixarPdf(pdfUrl);
  if (!pdfBytes) return NextResponse.json({ error: 'download_falhou' }, { status: 422 });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const b64 = Buffer.from(pdfBytes).toString('base64');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    const texto = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON não encontrado');

    const parsed = JSON.parse(match[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cargosBrutos: any[] = (parsed.cargos ?? []).filter((c: any) => c?.nome);
    if (cargosBrutos.length === 0) throw new Error('nenhum cargo extraído');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cargosParaInserir = cargosBrutos.map((c: any) => ({
      edital_id: id,
      nome: String(c.nome).trim().slice(0, 200),
      materias: (Array.isArray(c.materias) ? c.materias : []).map((m: unknown) => String(m).trim()).filter(Boolean).slice(0, 40),
      salario: typeof c.salario === 'number' ? c.salario : null,
      vagas: typeof c.vagas === 'number' ? Math.round(c.vagas) : null,
      formacao_exigida: Array.isArray(c.formacao_exigida) ? c.formacao_exigida : [],
      registro_conselho_exigido: Array.isArray(c.registro_conselho_exigido) ? c.registro_conselho_exigido : [],
      local_prova: Array.isArray(c.local_prova) ? c.local_prova : [],
      data_prova: c.data_prova ?? null,
      escolaridade: ['fundamental','medio','superior'].includes(c.escolaridade) ? c.escolaridade : 'superior',
      area: AREAS.includes(c.area) ? c.area : 'administrativo',
      cotas: typeof c.cotas === 'object' && c.cotas !== null ? c.cotas : null,
      etapas: Array.isArray(c.etapas) ? c.etapas : [],
    }));

    const { data: cargosSalvos } = await supabase
      .from('cargos')
      .insert(cargosParaInserir)
      .select();

    // Atualiza campos globais do edital
    const upd: Record<string, unknown> = { pdf_processado: true };
    if (parsed.banca && !edital.link_inscricao) upd.banca = parsed.banca;
    if (parsed.link_inscricao) upd.link_inscricao = parsed.link_inscricao;
    if (parsed.data_inscricao_inicio) upd.data_inscricao_inicio = parsed.data_inscricao_inicio;
    if (parsed.data_inscricao_fim) upd.data_inscricao_fim = parsed.data_inscricao_fim;
    if (pdfUrl !== edital.link_edital_pdf) upd.link_edital_pdf = pdfUrl;
    // materias do primeiro cargo como fallback para compatibilidade
    if (cargosParaInserir[0]?.materias?.length > 0) upd.materias = cargosParaInserir[0].materias;

    await supabase.from('editais').update(upd).eq('id', id);

    return NextResponse.json({ cargos: cargosSalvos });
  } catch (e) {
    console.error('[extrair-cargos]', e);
    return NextResponse.json({ error: 'extracao_falhou' }, { status: 500 });
  }
}
