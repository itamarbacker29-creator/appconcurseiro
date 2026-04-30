'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IDENTIDADE } from '@/config/identidade';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const erros: Record<string, string> = {};

    if (!senha || senha.length < 6) erros.senha = 'Mínimo 6 caracteres';
    if (senha !== confirmar) erros.confirmar = 'As senhas não coincidem';

    if (Object.keys(erros).length) { setErrors(erros); return; }
    setErrors({});
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Senha redefinida com sucesso!', 'success');
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" alt="O Tutor" width={40} height={40} className="rounded-xl" />
          <h1 className="text-[20px] font-bold text-(--ink)">{IDENTIDADE.nomeCurto}</h1>
          <p className="text-[13px] text-(--ink-3)">Crie uma nova senha para sua conta</p>
        </div>

        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-6 flex flex-col gap-5">
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              error={errors.senha}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              placeholder="••••••••"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              error={errors.confirmar}
            />
            <Button type="submit" loading={loading} size="md" className="w-full mt-1">
              Salvar nova senha
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
