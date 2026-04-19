import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: edital } = await supabase.from('editais').select('*').eq('id', id).single();

  if (!edital) notFound();

  const materias: string[] = edital.materias ?? [];
  const diasFim = edital.data_inscricao_fim
    ? Math.ceil((new Date(edital.data_inscricao_fim).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-(--ink-3) mb-4">
        <Link href="/editais" className="hover:text-(--accent)">Editais</Link>
        <span>/</span>
        <span className="truncate text-(--ink)">{edital.orgao}</span>
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
      </div>

      {/* Grid de info */}
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

      {/* Prazos */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold text-(--ink) mb-3">Prazos</h2>
        <div className="flex flex-col gap-2">
          {edital.data_inscricao_inicio && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-(--teal) shrink-0" />
              <span className="text-[13px] text-(--ink-2)">
                Início das inscrições:{' '}
                <strong>{new Date(edital.data_inscricao_inicio).toLocaleDateString('pt-BR')}</strong>
              </span>
            </div>
          )}
          {edital.data_inscricao_fim && (
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${diasFim !== null && diasFim <= 5 ? 'bg-red-500' : 'bg-(--warning)'}`} />
              <span className="text-[13px] text-(--ink-2)">
                Fim das inscrições:{' '}
                <strong className={diasFim !== null && diasFim <= 5 ? 'text-red-500' : ''}>
                  {new Date(edital.data_inscricao_fim).toLocaleDateString('pt-BR')}
                  {diasFim !== null && diasFim >= 0 && ` (${diasFim} dias)`}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Matérias */}
      {materias.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-(--ink) mb-3">Matérias cobradas</h2>
          <div className="flex flex-wrap gap-2">
            {materias.map((m: string) => <Badge key={m} variant="default">{m}</Badge>)}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          {edital.link_inscricao ? (
            <a href={edital.link_inscricao} target="_blank" rel="noopener noreferrer">
              <Button size="md">Ir para inscrição oficial ↗</Button>
            </a>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-2">
                {edital.link_fonte && (
                  <a href={edital.link_fonte} target="_blank" rel="noopener noreferrer">
                    <Button size="md" variant="ghost">Ver anúncio do edital ↗</Button>
                  </a>
                )}
              </div>
              <p className="text-[12px] text-(--ink-3) max-w-115">
                ⚠️ Link oficial de inscrição não disponível. Use o anúncio acima para localizar o portal oficial do órgão (ex: site da banca organizadora ou gov.br).
              </p>
            </div>
          )}
          <Link href={`/simulado?edital=${edital.id}`}>
            <Button size="md" variant="ghost">Iniciar simulado</Button>
          </Link>
          <Link href={`/editais/${edital.id}/raio-x`}>
            <Button size="md" variant="ghost">Ver Raio-X</Button>
          </Link>
          <Link href={`/plano?edital=${edital.id}`}>
            <Button size="md" variant="ghost">Adicionar ao plano</Button>
          </Link>
          {edital.link_edital_pdf && (
            <a href={edital.link_edital_pdf} target="_blank" rel="noopener noreferrer">
              <Button size="md" variant="ghost">Ver edital PDF</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
