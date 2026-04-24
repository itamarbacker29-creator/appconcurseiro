import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardBanca } from '@/components/editais/CardBanca';
import { ResumoEdital } from '@/components/editais/ResumoEdital';
import { RecomendacaoParticipacao } from '@/components/editais/RecomendacaoParticipacao';
import { AcoesSalvarInscrito } from '@/components/editais/AcoesSalvarInscrito';
import Link from 'next/link';

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: edital }, { data: bancaRow }] = await Promise.all([
    supabase.from('editais').select('*').eq('id', id).single(),
    // busca banca depois — só possível depois de ter o edital, mas usamos Promise.all com fallback
    supabase.from('bancas').select('nome,nome_alternativo,perfil_resumido,caracteristicas,dica_estudo,nivel_dificuldade').limit(20),
  ]);

  if (!edital) notFound();

  // Match banca por nome (ilike) no array retornado
  const bancaNome = edital.banca ?? '';
  const banca = (bancaRow ?? []).find(b => {
    const n = bancaNome.toLowerCase();
    if (b.nome.toLowerCase().includes(n) || n.includes(b.nome.toLowerCase())) return true;
    return (b.nome_alternativo as string[] ?? []).some(a => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n));
  }) ?? null;

  const materias: string[] = edital.materias ?? [];
  const diasFim = edital.data_inscricao_fim
    ? Math.ceil((new Date(edital.data_inscricao_fim).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-(--ink-3) mb-4 flex-wrap">
        <Link href="/editais" className="hover:text-(--accent)">Editais</Link>
        <span>/</span>
        <span className="text-(--ink) truncate">{edital.orgao}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-(--ink-3) uppercase tracking-wide">{edital.orgao}</span>
          <Badge variant={edital.status === 'ativo' ? 'success' : 'default'}>
            {edital.status === 'ativo' ? 'Ativo' : edital.status}
          </Badge>
          {diasFim !== null && diasFim <= 5 && diasFim >= 0 && (
            <Badge variant="danger">⚡ Urgente — {diasFim} dia{diasFim !== 1 ? 's' : ''}</Badge>
          )}
        </div>
        <h1 className="text-[24px] font-bold text-(--ink)">{edital.cargo}</h1>
        {user && <AcoesSalvarInscrito editalId={id} />}
      </div>

      {/* Grid de info principal */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Salário', val: edital.salario ? `R$ ${edital.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—' },
          { label: 'Vagas', val: edital.vagas ? edital.vagas.toLocaleString() : '—' },
          { label: 'Banca', val: edital.banca ?? '—' },
          { label: 'Estado', val: edital.estado ?? '—' },
          { label: 'Escolaridade', val: edital.escolaridade ?? '—' },
          { label: 'Área', val: edital.area ?? '—' },
        ].map(item => (
          <div key={item.label} className="bg-(--surface-2) rounded-(--radius-sm) px-3 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{item.label}</span>
            <span className="text-[14px] font-semibold text-(--ink)">{item.val}</span>
          </div>
        ))}
      </div>

      {/* Feature 2B — Resumo estruturado (datas, taxa, isenção, cotas, etapas) */}
      <div className="mb-6">
        <ResumoEdital
          taxa_inscricao={edital.taxa_inscricao ?? null}
          isencao_taxa={edital.isencao_taxa ?? null}
          cotas={edital.cotas ?? null}
          data_prova={edital.data_prova ?? null}
          data_inscricao_inicio={edital.data_inscricao_inicio ?? null}
          data_inscricao_fim={edital.data_inscricao_fim ?? null}
          etapas={edital.etapas ?? null}
          local_prova={edital.local_prova ?? null}
        />
      </div>

      {/* Feature 1 — Análise da banca */}
      {banca && bancaNome && (
        <div className="mb-6">
          <CardBanca
            nome={banca.nome}
            perfilResumido={banca.perfil_resumido}
            caracteristicas={banca.caracteristicas as Parameters<typeof CardBanca>[0]['caracteristicas']}
            dicaEstudo={banca.dica_estudo}
            nivelDificuldade={banca.nivel_dificuldade ?? 'médio'}
          />
        </div>
      )}

      {/* Matérias */}
      {materias.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-(--ink) mb-3">Matérias cobradas</h2>
          <div className="flex flex-wrap gap-2">
            {materias.map((m: string) => <Badge key={m} variant="default">{m}</Badge>)}
          </div>
        </div>
      )}

      {/* Feature 2C — Recomendação personalizada */}
      {user && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-(--ink) mb-3">Análise de participação</h2>
          <RecomendacaoParticipacao
            editalId={id}
            linkInscricao={edital.link_inscricao ?? null}
          />
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        {edital.link_inscricao ? (
          <a href={edital.link_inscricao} target="_blank" rel="noopener noreferrer">
            <Button size="md">Ir para inscrição oficial ↗</Button>
          </a>
        ) : (
          <div className="flex flex-col gap-1">
            {edital.link_fonte && (
              <a href={edital.link_fonte} target="_blank" rel="noopener noreferrer">
                <Button size="md" variant="ghost">Ver anúncio do edital ↗</Button>
              </a>
            )}
            <p className="text-[12px] text-(--ink-3) max-w-sm">
              ⚠️ Link oficial de inscrição não disponível. Localize o portal oficial do órgão pelo anúncio acima.
            </p>
          </div>
        )}
        <Link href={`/editais/${id}/raio-x`}>
          <Button size="md" variant="ghost">Ver Raio-X</Button>
        </Link>
        <Link href={`/simulado?edital=${id}`}>
          <Button size="md" variant="ghost">Iniciar simulado</Button>
        </Link>
        <Link href={`/plano?edital=${id}`}>
          <Button size="md" variant="ghost">Adicionar ao plano</Button>
        </Link>
        {edital.link_edital_pdf && (
          <a href={edital.link_edital_pdf} target="_blank" rel="noopener noreferrer">
            <Button size="md" variant="ghost">
              <span className="material-symbols-outlined text-[16px] mr-1">download</span>
              Edital PDF
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
