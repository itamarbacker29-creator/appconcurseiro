'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Material {
  id: string;
  titulo: string;
  nome_arquivo: string;
  materia: string | null;
  tamanho_bytes: number | null;
  criado_em: string;
}

const MATERIAS = [
  'Direito Constitucional', 'Direito Administrativo', 'Direito Penal',
  'Direito Processual Penal', 'Direito Civil', 'Direito do Trabalho',
  'Direito Tributário', 'Português', 'Inglês', 'Matemática',
  'Raciocínio Lógico', 'Informática', 'Administração', 'Economia',
  'Contabilidade', 'Legislação Específica',
];

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ApostilasPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [materia, setMateria] = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('materiais')
      .select('id, titulo, nome_arquivo, materia, tamanho_bytes, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false });
    setMateriais(data ?? []);
    setLoading(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArquivo(f);
    if (f && !titulo) setTitulo(f.name.replace(/\.pdf$/i, ''));
  }

  async function enviar() {
    if (!arquivo) return toast('Selecione um PDF.', 'error');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', arquivo);
      fd.append('titulo', titulo || arquivo.name.replace(/\.pdf$/i, ''));
      if (materia) fd.append('materia', materia);

      const resp = await fetch('/api/materiais/upload', { method: 'POST', body: fd });
      const data = await resp.json();

      if (!resp.ok) {
        toast(data.error ?? 'Erro ao fazer upload.', 'error');
        return;
      }

      toast('Apostila enviada com sucesso!', 'success');
      setArquivo(null);
      setTitulo('');
      setMateria('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await carregar();
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    if (error) { toast('Erro ao excluir.', 'error'); return; }
    setMateriais(prev => prev.filter(m => m.id !== id));
    toast('Apostila removida.', 'success');
  }

  return (
    <div className="p-4 md:p-6 max-w-[860px] mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-(--ink)">Apostilas</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Faça upload dos seus PDFs e gere flashcards com IA.</p>
      </div>

      {/* Upload */}
      <Card padding="md" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 20 }}>upload_file</span>
          <h2 className="text-[14px] font-bold text-(--ink)">Adicionar apostila</h2>
        </div>

        <div
          className="border-2 border-dashed border-(--border-strong) rounded-sm p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-(--accent) transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 40 }}>picture_as_pdf</span>
          {arquivo ? (
            <div className="text-center">
              <p className="text-[13px] font-semibold text-(--ink)">{arquivo.name}</p>
              <p className="text-[11px] text-(--ink-3)">{formatBytes(arquivo.size)}</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-medium text-(--ink-2)">Clique para selecionar um PDF</p>
              <p className="text-[11px] text-(--ink-3)">Máximo 20 MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {arquivo && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-(--ink-2) block mb-1">Título</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Direito Administrativo — Capítulo 3"
                  className="w-full h-10 px-3 rounded-sm border border-(--border-strong) text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-(--ink-2) block mb-1">Matéria (opcional)</label>
                <select
                  value={materia}
                  onChange={e => setMateria(e.target.value)}
                  className="w-full h-10 px-3 rounded-sm border border-(--border-strong) text-[13px] bg-(--surface) text-(--ink) outline-none focus:border-(--accent) transition-colors"
                >
                  <option value="">— Selecionar —</option>
                  {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <Button loading={uploading} onClick={enviar}>
              Enviar apostila
            </Button>
          </div>
        )}
      </Card>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-sm" />
          ))
        ) : materiais.length === 0 ? (
          <Card padding="lg" className="text-center">
            <span className="material-symbols-outlined text-(--ink-3)" style={{ fontSize: 40 }}>menu_book</span>
            <p className="text-[14px] font-semibold text-(--ink-2) mt-2">Nenhuma apostila ainda.</p>
            <p className="text-[13px] text-(--ink-3) mt-1">Faça upload de um PDF acima para começar.</p>
          </Card>
        ) : (
          materiais.map(m => (
            <Card key={m.id} padding="md" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--accent-light) flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-(--accent)" style={{ fontSize: 20 }}>picture_as_pdf</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-(--ink) truncate">{m.titulo}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {m.materia && (
                    <span className="text-[10px] font-semibold text-(--accent) bg-(--accent-light) px-2 py-0.5 rounded-full">
                      {m.materia}
                    </span>
                  )}
                  <span className="text-[11px] text-(--ink-3)">{formatBytes(m.tamanho_bytes)}</span>
                  <span className="text-[11px] text-(--ink-3)">{formatData(m.criado_em)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/apostilas/${m.id}`}>
                  <button className="px-3 py-1.5 bg-(--accent) text-white text-[12px] font-semibold rounded-sm hover:opacity-90 transition-opacity">
                    Abrir
                  </button>
                </Link>
                <button
                  onClick={() => excluir(m.id)}
                  className="p-1.5 text-(--ink-3) hover:text-(--danger) transition-colors"
                  title="Excluir"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
