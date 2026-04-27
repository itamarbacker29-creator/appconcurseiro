import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { anthropic, MODELO_PRINCIPAL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Fator de dificuldade por banca: quanto mais difícil, mais penaliza a chance bruta
const BANCA_FATOR: Record<string, number> = {
  'CESPE': 0.72, 'CEBRASPE': 0.72,
  'FGV': 0.75,
  'QUADRIX': 0.78,
  'FCC': 0.82, 'CESGRANRIO': 0.82, 'IADES': 0.84,
  'VUNESP': 0.87,
  'IBFC': 0.90, 'CONSULPLAN': 0.92,
};

function fatorBanca(bancaNome: string | null): number {
  if (!bancaNome) return 0.85; // padrão moderado
  const nome = bancaNome.toUpperCase();
  const key = Object.keys(BANCA_FATOR).find(k => nome.includes(k));
  return key ? BANCA_FATOR[key] : 0.85;
}

function filtrarHabilidadesCargo(
  habilidades: { materia: string; theta: number }[],
  materiasCargo: string[] | null,
): { materia: string; theta: number }[] {
  if (!materiasCargo || materiasCargo.length === 0) return habilidades;
  return habilidades.filter(h =>
    materiasCargo.some(m => {
      const ml = m.toLowerCase();
      const hl = h.materia.toLowerCase();
      // hl.includes(ml) removido: "matemática financeira" NÃO deve casar com "matemática"
      return ml === hl || ml.includes(hl);
    })
  );
}

function calcularChance(
  habilidades: { materia: string; theta: number }[],
  materiasCargo: string[] | null,
  bancaNome: string | null,
  formacaoOk: boolean | null,
  registroOk: boolean | null,
): number | null {
  // Inelegível por requisito = chance zero
  if (formacaoOk === false || registroOk === false) return 0;

  if (!habilidades || habilidades.length === 0) return null;

  const relevantes = filtrarHabilidadesCargo(habilidades, materiasCargo);
  if (relevantes.length === 0) return null; // sem treino nas matérias deste cargo

  // Média do theta nas matérias relevantes (theta ∈ [-3, +3])
  const avg = relevantes.reduce((s, h) => s + h.theta, 0) / relevantes.length;
  let chance = Math.round(((avg + 3) / 6) * 100);

  // Penalidade por baixa cobertura: se só tem dados p/ 2 de 10 matérias, penaliza
  if (materiasCargo && materiasCargo.length > 0) {
    const cobertura = relevantes.length / materiasCargo.length;
    chance = Math.round(chance * (0.5 + 0.5 * cobertura));
  }

  // Penalidade por dificuldade da banca
  chance = Math.round(chance * fatorBanca(bancaNome));

  return Math.max(0, Math.min(99, chance));
}

function verificarFormacao(userFormacao: string | null, exigida: string[] | null): boolean | null {
  if (!exigida || exigida.length === 0) return null; // requisito não especificado
  if (!userFormacao) return false;
  const u = userFormacao.toLowerCase();
  return exigida.some(f => u.includes(f.toLowerCase()) || f.toLowerCase().includes(u));
}

function verificarRegistro(userRegistros: string[] | null, exigido: string[] | null): boolean | null {
  if (!exigido || exigido.length === 0) return null;
  if (!userRegistros || userRegistros.length === 0) return false;
  return exigido.some(r => userRegistros.map(u => u.toLowerCase()).includes(r.toLowerCase()));
}

function calcularCotas(profile: Record<string, unknown>, cotasEdital: Record<string, number> | null): string[] {
  if (!cotasEdital) return [];
  const e: string[] = [];
  if (profile.pcd && cotasEdital.pcd) e.push('PcD');
  if (profile.elegivel_cota_racial && cotasEdital.racial) e.push('racial');
  if (profile.elegivel_cota_indigena && cotasEdital.indigena) e.push('indígena');
  if (profile.elegivel_cota_quilombola && cotasEdital.quilombola) e.push('quilombola');
  return e;
}

function calcularRecomendacao(
  chance: number | null,
  formacaoOk: boolean | null,
  registroOk: boolean | null,
): 'forte' | 'moderada' | 'nao_recomendado' | 'inelegivel' {
  if (formacaoOk === false || registroOk === false) return 'inelegivel';
  if (chance === null) return 'moderada'; // sem dados suficientes para calcular
  if (chance >= 58) return 'forte';
  if (chance >= 32) return 'moderada';
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

  const formacaoExigida = cargo?.formacao_exigida ?? edital.formacao_exigida;
  const registroExigido = cargo?.registro_conselho_exigido ?? edital.registro_conselho_exigido;
  const cotasEdital = (cargo?.cotas ?? edital.cotas) as Record<string, number> | null;
  const materiasCargo: string[] | null = cargo?.materias ?? edital.materias ?? null;
  const bancaNome = edital.banca ?? null;

  const formacaoAdequada = verificarFormacao(profile.formacao, formacaoExigida);
  const registroAdequado = verificarRegistro(profile.registros_conselho, registroExigido);
  const cotasElegiveis = calcularCotas(profile as Record<string, unknown>, cotasEdital);
  const elegivelIsencao = !!(profile.elegivel_isencao_taxa && (edital.isencao_taxa as { disponivel?: boolean } | null)?.disponivel);

  const chance = calcularChance(habilidades ?? [], materiasCargo, bancaNome, formacaoAdequada, registroAdequado);
  const recomendacao = calcularRecomendacao(chance, formacaoAdequada, registroAdequado);

  // Habilidades filtradas APENAS às matérias do cargo, para o contexto da IA
  const habRelevantes = filtrarHabilidadesCargo(habilidades ?? [], materiasCargo)
    .sort((a, b) => a.theta - b.theta);

  const habCtx = habRelevantes.length > 0
    ? habRelevantes
        .map(h => `${h.materia}: ${Math.round(((h.theta + 3) / 6) * 100)}%`)
        .join(', ')
    : 'sem histórico nas matérias deste cargo';

  const materiasStr = materiasCargo?.join(', ') || 'não especificadas';
  const requisitoStr = [
    ...(formacaoExigida ?? []),
    ...(registroExigido ?? []),
  ].join(', ') || 'nenhum especificado';

  let textoIA: string | null = null;
  try {
    const prompt = `Concurso: ${edital.orgao} — ${edital.cargo}${bancaNome ? ` | Banca: ${bancaNome}` : ''}
Requisitos do cargo: ${requisitoStr}
Formação do candidato: ${profile.formacao} → ${formacaoAdequada === false ? 'NÃO atende' : formacaoAdequada === true ? 'atende' : 'não verificado'}
Matérias cobradas no edital: ${materiasStr}
Desempenho do candidato nessas matérias (fraco → forte): ${habCtx}
Chance estimada de aprovação: ${chance !== null ? `${chance}%` : 'sem dados suficientes'}
Status: ${recomendacao}

Escreva 2 frases diretas e honestas de recomendação. Mencione APENAS matérias do edital. Se o candidato não atende requisitos, diga claramente. Máximo 55 palavras.`;

    const resp = await anthropic.messages.create({
      model: MODELO_PRINCIPAL,
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    textoIA = (resp.content[0] as { text: string }).text.trim();
  } catch {
    // fallback silencioso
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
