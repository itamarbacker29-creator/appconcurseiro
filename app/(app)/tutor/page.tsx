'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function TutorPage() {
  const [plano, setPlano] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('plano').eq('id', user.id).single()
        .then(({ data }) => {
          setPlano(data?.plano ?? 'free');
          setLoading(false);
        });
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (plano === 'free') {
    return (
      <div className="p-4 md:p-6 max-w-[600px] mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-(--accent-light) flex items-center justify-center text-3xl">
          ◍
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-(--ink)">Tutor IA 24/7</h1>
          <p className="text-[14px] text-(--ink-3) mt-2 max-w-[360px]">
            Tire dúvidas sobre qualquer matéria do seu concurso a qualquer hora, com explicações detalhadas e referências legais.
          </p>
        </div>

        <div className="bg-(--surface) border-2 border-(--accent)/30 rounded-(--radius) p-5 w-full max-w-[360px] flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-semibold text-(--accent) uppercase tracking-wide mb-1">Disponível no plano Premium</p>
            <p className="text-[13px] text-(--ink-2)">O Tutor IA usa Claude Haiku — o modelo mais preciso para explicações jurídicas e técnicas em português.</p>
          </div>
          <ul className="flex flex-col gap-2 text-[13px] text-(--ink-2) text-left">
            {[
              'Explicações com referência em lei e jurisprudência',
              'Contexto do seu edital e banca específica',
              'Histórico de conversa preservado',
              '50 perguntas/mês no Premium · ilimitado no Elite',
            ].map(b => (
              <li key={b} className="flex items-start gap-2">
                <span className="text-(--teal) mt-0.5 shrink-0">✓</span> {b}
              </li>
            ))}
          </ul>
          <Link href="/conta#plano">
            <Button className="w-full">Ver planos e fazer upgrade</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Premium / Elite — interface do tutor (em breve completo)
  return (
    <div className="p-4 md:p-6 max-w-[700px] mx-auto flex flex-col min-h-[80vh]">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-(--ink)">Tutor IA</h1>
        <p className="text-[13px] text-(--ink-3) mt-1">Powered by Claude Haiku — respostas precisas com referência legal.</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-(--accent-light) flex items-center justify-center text-2xl">◍</div>
        <div>
          <p className="text-[15px] font-semibold text-(--ink)">Interface completa em breve</p>
          <p className="text-[13px] text-(--ink-3) mt-1 max-w-[320px]">O chat do Tutor IA está em desenvolvimento e estará disponível na próxima atualização.</p>
        </div>
      </div>
    </div>
  );
}
