import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export interface Cargo {
  id: string;
  nome: string;
  materias: string[];
  salario: number | null;
  vagas: number | null;
  formacao_exigida: string[];
  registro_conselho_exigido: string[];
  local_prova: string[];
  data_prova: string | null;
  escolaridade: string;
  area: string;
  etapas: string[];
}

interface Props {
  editalId: string;
  cargos: Cargo[];
}

function formatarSalario(v: number | null) {
  if (!v) return null;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function ListaCargos({ editalId, cargos }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {cargos.map(cargo => (
        <div
          key={cargo.id}
          className="bg-(--surface) border border-(--border) rounded-(--radius) p-4 hover:border-(--accent)/30 transition-colors"
        >
          {/* Nome + badges */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <h3 className="text-[15px] font-bold text-(--ink) leading-snug">{cargo.nome}</h3>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {cargo.vagas && (
                <span className="text-[11px] font-semibold text-(--ink-3) bg-(--surface-2) px-2 py-0.5 rounded-full">
                  {cargo.vagas} vg
                </span>
              )}
              {cargo.salario && (
                <span className="text-[12px] font-bold text-(--teal)">
                  {formatarSalario(cargo.salario)}
                </span>
              )}
            </div>
          </div>

          {/* Requisitos */}
          {(cargo.formacao_exigida.length > 0 || cargo.registro_conselho_exigido.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {cargo.formacao_exigida.map(f => (
                <Badge key={f} variant="default">{f}</Badge>
              ))}
              {cargo.registro_conselho_exigido.map(r => (
                <Badge key={r} variant="warning">{r}</Badge>
              ))}
            </div>
          )}

          {/* Matérias (preview) */}
          {cargo.materias.length > 0 && (
            <p className="text-[12px] text-(--ink-3) mb-3 leading-relaxed">
              {cargo.materias.slice(0, 5).join(' · ')}
              {cargo.materias.length > 5 && ` · +${cargo.materias.length - 5} matérias`}
            </p>
          )}

          {/* Infos extras */}
          <div className="flex flex-wrap gap-3 text-[11px] text-(--ink-3) mb-3">
            {cargo.data_prova && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">event</span>
                Prova: {formatarData(cargo.data_prova)}
              </span>
            )}
            {cargo.local_prova.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">location_on</span>
                {cargo.local_prova.slice(0, 2).join(', ')}
                {cargo.local_prova.length > 2 && ` +${cargo.local_prova.length - 2}`}
              </span>
            )}
            {cargo.etapas.length > 0 && (
              <span>{cargo.etapas.join(' → ')}</span>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/editais/${editalId}/raio-x?cargo=${cargo.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-(--accent) text-[12px] font-semibold rounded-sm hover:opacity-90 transition-opacity"
              style={{ color: '#ffffff' }}
            >
              <span className="material-symbols-outlined text-[14px]">radar</span>
              Ver Raio-X
            </Link>
            <Link
              href={`/plano?edital=${editalId}&cargo=${cargo.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-(--border-strong) text-[12px] font-semibold rounded-sm hover:border-(--accent) hover:text-(--accent) transition-colors text-(--ink-2)"
            >
              Adicionar ao plano
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
