import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardBanca } from '@/components/editais/CardBanca';
import { ResumoEdital } from '@/components/editais/ResumoEdital';
import { RecomendacaoParticipacao } from '@/components/editais/RecomendacaoParticipacao';
import { AcoesSalvarInscrito } from '@/components/editais/AcoesSalvarInscrito';
import Link from 'next/link';

const CARGOS_GENERICOS = new Set(['diversos', 'vários cargos', 'varios cargos', 'vários', 'varios']);

function isCargoGenerico(cargo: string) {
  return CARGOS_GENERICOS.has(cargo.toLowerCase().trim());
}

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: edital }, { data: bancaRow }] = await Promise.all([
    supabase.from('editais').select('*').eq('id', id).single(),
    supabase.from('bancas').select('nome,nome_alternativo,perfil_resumido,caracteristicas,dica_estudo,nivel_dificuldade').limit(20),
  ]);

  if (!edital) notFound();

  const bancaNome = edital.banca ?? '';
  const banca = (bancaRow ?? []).find(b => {
    const n = bancaNome.toLowerCase();
    if (b.nome.toLowerCase().includes(n) || n.includes(b.nome.toLowerCase())) return true;
    return (b.nome_alternativo as string[] ?? []).some(a => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n));
  }) ?? null;

  const materias: string[] = edital.materias ?? [];
  const formacaoExigida: string[] = edital.formacao_exigida ?? [];
  const registroConselho: string[] = edital.registro_conselho_exigido ?? [];
  const requisitos = [...formacaoExigida, ...registroConselho];
  const diasFim = edital.data_inscricao_fim
    ? Math.ceil((new Date(edital.data_inscricao_fim).getTime() - Date.now()) / 86400000)
    : null;

  const cargoGenerico = isCargoGenerico(edital.cargo ?? '');
  const linkFonte = edital.link_edital_pdf || edital.link_fonte || edital.link_inscricao;

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

        {cargoGenerico ? (
          /* Cargo genérico — exibe aviso prominente */
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-(--radius) p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 shrink-0" style={{ fontSize: 22 }}>warning</span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-(--ink-2)">Cargos ainda não discriminados</p>
                <p className="text-[12px] text-(--ink-3) mt-0.5">
                  Este edital possui múltiplos cargos. Acesse o edital oficial para ver a lista completa.
                </p>
              </div>
              {linkFonte && (
                <a href={linkFonte} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 border border-(--border-strong) rounded-sm text-[12px] font-semibold text-(--ink-2) hover:border-(--accent) hover:text-(--accent) transition-colors">
                  Ver edital ↗
                </a>
              )}
            </div>
          </div>
        ) : (
          <h1 className="text-[24px] font-bold text-(--ink)">{edital.cargo}</h1>
        )}

        {user && !cargoGenerico && <AcoesSalvarInscrito editalId={id} />}
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

      {/* Resumo datas, taxa, etapas */}
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

      {/* Análise da banca */}
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

      {/* Requisitos da vaga */}
      {requisitos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-(--ink) mb-3">Requisitos</h2>
          <div className="flex flex-wrap gap-2">
            {requisitos.map((r: string) => (
              <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-(--border) bg-(--surface-2) text-[12px] font-medium text-(--ink-2)">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matérias cobradas — clicáveis → simulado */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold text-(--ink) mb-3">Matérias cobradas</h2>
        {materias.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {materias.map((m: string) => (
              <Link
                key={m}
                href={`/simulado?materia=${encodeURIComponent(m)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-(--border) bg-(--surface-2) text-[12px] font-medium text-(--ink-2) hover:border-(--accent) hover:text-(--accent) hover:bg-(--accent)/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>quiz</span>
                {m}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-(--surface-2) border border-(--border) rounded-(--radius) p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 22 }}>schedule</span>
            <p className="text-[13px] text-(--ink-3)">
              Matérias serão extraídas automaticamente do edital em breve.
            </p>
          </div>
        )}
      </div>

      {/* Recomendação personalizada */}
      {user && !cargoGenerico && (
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
        ) : linkFonte ? (
          <a href={linkFonte} target="_blank" rel="noopener noreferrer">
            <Button size="md" variant="ghost">Ver edital oficial ↗</Button>
          </a>
        ) : null}

        {!cargoGenerico && (
          <>
            <Link href={`/editais/${id}/raio-x`}>
              <Button size="md" variant="ghost">Ver Raio-X</Button>
            </Link>
            <Link href={`/simulado?edital=${id}`}>
              <Button size="md" variant="ghost">Iniciar simulado</Button>
            </Link>
            <Link href={`/plano?edital=${id}`}>
              <Button size="md" variant="ghost">Adicionar ao plano</Button>
            </Link>
          </>
        )}

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
