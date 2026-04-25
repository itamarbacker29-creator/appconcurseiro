import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { anthropic, MODELO_PRINCIPAL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function calcularChance(
  habilidades: { materia: string; theta: number }[],
  materiasCargo: string[] | null,
): number | null {
  if (!habilidades || habilidades.length === 0) return null;

  // Se temos matérias do cargo, filtra só as relevantes
  if (materiasCargo && materiasCargo.length > 0) {
    const relevantes = habilidades.filter(h =>
      materiasCargo.some(m => {
        const ml = m.toLowerCase(); const hl = h.materia.toLowerCase();
        return ml === hl || ml.includes(hl) || hl.includes(ml);
      })
    );
    if (relevantes.length === 0) return null; // sem treino nas matérias do cargo
    const avg = relevantes.reduce((s, h) => s + h.theta, 0) / relevantes.length;
    return Math.round(((avg + 3) / 6) * 100);
  }

  const avg = habilidades.reduce((s, h) => s + h.theta, 0) / habilidades.length;
  return Math.round(((avg + 3) / 6) * 100);
}

function verificarFormacao(userFormacao: string | null, exigida: string[] | null): boolean | null {
  if (!exigida || exigida.length === 0) return null; // não aplicável
  if (!userFormacao) return false;
  const u = userFormacao.toLowerCase();
  return exigida.some(f => u.includes(f.toLowerCase()) || f.toLowerCase().includes(u));
}

function verificarRegistro(userRegistros: string[] | null, exigido: string[] | null): boolean | null {
  if (!exigido || exigido.length === 0) return null; // não aplicável
  if (!userRegistros || userRegistros.length === 0) return false;
  return exigido.some(r => userRegistros.map(u => u.toLowerCase()).includes(r.toLowerCase()));
}

function calcularCotas(profile: Record<string, unknown>, cotasEdital: Record<string, number> | null): string[] {
  if (!cotasEdital) return [];
  const elegiveis: string[] = [];
  if (profile.pcd && cotasEdital.pcd) elegiveis.push('PcD');
  if (profile.elegivel_cota_racial && cotasEdital.racial) elegiveis.push('racial');
  if (profile.elegivel_cota_indigena && cotasEdital.indigena) elegiveis.push('indígena');
  if (profile.elegivel_cota_quilombola && cotasEdital.quilombola) elegiveis.push('quilombola');
  return elegiveis;
}

function calcularRecomendacao(
  chance: number | null,
  formacaoOk: boolean | null,
  registroOk: boolean | null,
): 'forte' | 'moderada' | 'nao_recomendado' | 'inelegivel' {
  if (formacaoOk === false || registroOk === false) return 'inelegivel';
  if (chance === null) return 'moderada'; // sem dados suficientes
  if (chance >= 60) return 'forte';
  if (chance >= 35) return 'moderada';
  return 'nao_recomendado';
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { editalId, cargoId } = await req.json();
  if (!editalId) return NextResponse.json({ error: 'editalId obrigatório' }, { status: 400 });

  const [{ data: edital }, { data: cargo }, { data: profile }, { data: habilidades }] = await Promise.all([
    supabase.from('editais')
      .select('orgao,cargo,banca,materias,formacao_exigida,registro_conselho_exigido,cotas,isencao_taxa')
      .eq('id', editalId)
      .single(),
    cargoId
      ? supabase.from('cargos')
          .select('nome,materias,formacao_exigida,registro_conselho_exigido,cotas')
          .eq('id', cargoId)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles')
      .select('formacao,registros_conselho,pcd,elegivel_cota_racial,elegivel_cota_indigena,elegivel_cota_quilombola,elegivel_isencao_taxa')
      .eq('id', user.id)
      .single(),
    supabase.from('habilidade_usuario')
      .select('materia,theta')
      .eq('user_id', user.id),
  ]);

  if (!edital) return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 });

  if (!profile?.formacao) {
    return NextResponse.json({ recomendacao: 'perfil_incompleto' });
  }

  // Usa dados do cargo específico quando disponível, senão do edital genérico
  const formacaoExigida = cargo?.formacao_exigida ?? edital.formacao_exigida;
  const registroExigido = cargo?.registro_conselho_exigido ?? edital.registro_conselho_exigido;
  const cotasEdital = (cargo?.cotas ?? edital.cotas) as Record<string, number> | null;
  const materiasCargo = cargo?.materias ?? edital.materias ?? null;

  const chance = calcularChance(habilidades ?? [], materiasCargo);
  const formacaoAdequada = verificarFormacao(profile.formacao, formacaoExigida);
  const registroAdequado = verificarRegistro(profile.registros_conselho, registroExigido);
  const cotasElegiveis = calcularCotas(profile as Record<string, unknown>, cotasEdital);
  const elegivelIsencao = !!(profile.elegivel_isencao_taxa && (edital.isencao_taxa as { disponivel?: boolean } | null)?.disponivel);
  const recomendacao = calcularRecomendacao(chance, formacaoAdequada, registroAdequado);

  // Texto IA
  let textoIA: string | null = null;
  try {
    const habCtx = habilidades && habilidades.length > 0
      ? habilidades.sort((a, b) => a.theta - b.theta).slice(0, 5)
          .map(h => `${h.materia}: ${Math.round(((h.theta + 3) / 6) * 100)}%`)
          .join(', ')
      : 'sem histórico';

    const prompt = `Edital: ${edital.orgao} — ${edital.cargo}${edital.banca ? ` (${edital.banca})` : ''}
Formação do candidato: ${profile.formacao}
Registros: ${(profile.registros_conselho as string[] || []).join(', ') || 'nenhum'}
Cotas elegíveis: ${cotasElegiveis.join(', ') || 'nenhuma'}
Chance de aprovação estimada: ${chance ?? 'sem dados'}%
Desempenho por matéria (mais fraco → mais forte): ${habCtx}
Status: ${recomendacao}

Escreva 2 frases diretas e honestas de recomendação. Mencione dados concretos. Máximo 55 palavras.`;

    const resp = await anthropic.messages.create({
      model: MODELO_PRINCIPAL,
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    textoIA = (resp.content[0] as { text: string }).text.trim();
  } catch {
    // falha silenciosa — componente usa fallback
  }

  return NextResponse.json({
    recomendacao,
    chanceAprovacao: chance,
    formacaoAdequada,
    registroAdequado,
    cotasElegiveis,
    elegivelIsencao,
    textoIA,
  });
}
