'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IDENTIDADE } from '@/config/identidade';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

type Aba = 'entrar' | 'cadastrar';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [aba, setAba] = useState<Aba>('entrar');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', lgpd: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const erros: Record<string, string> = {};

    if (!form.email) erros.email = 'E-mail obrigatório';
    if (!form.senha || form.senha.length < 6) erros.senha = 'Mínimo 6 caracteres';
    if (aba === 'cadastrar' && !form.nome) erros.nome = 'Nome obrigatório';
    if (aba === 'cadastrar' && !form.lgpd) erros.lgpd = 'Aceite os termos para continuar';

    if (Object.keys(erros).length) { setErrors(erros); return; }
    setErrors({});
    setLoading(true);

    try {
      if (aba === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.senha });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.senha,
          options: { data: { full_name: form.nome } },
        });
        if (error) throw error;
        toast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
        setAba('entrar');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function magicLink() {
    if (!form.email) { setErrors({ email: 'Digite o e-mail para receber o link' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: form.email });
    setLoading(false);
    if (error) toast(error.message, 'error');
    else toast('Link enviado! Verifique seu e-mail.', 'success');
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-(--accent) flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-(--ink)">{IDENTIDADE.nomeCurto}</h1>
          <p className="text-[13px] text-(--ink-3)">{IDENTIDADE.slogan}</p>
        </div>

        {/* Card */}
        <div className="bg-(--surface) border border-(--border) rounded-(--radius) p-6 flex flex-col gap-5">
          {/* Abas */}
          <div className="flex border border-(--border) rounded-(--radius-sm) p-0.5">
            {(['entrar', 'cadastrar'] as Aba[]).map(a => (
              <button
                key={a}
                onClick={() => setAba(a)}
                className={[
                  'flex-1 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all',
                  aba === a ? 'bg-(--accent) text-white' : 'text-(--ink-2) hover:text-(--ink)',
                ].join(' ')}
              >
                {a === 'entrar' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={loginGoogle}
            className="w-full flex items-center justify-center gap-3 h-10 border border-(--border-strong) rounded-(--radius-sm) text-[14px] font-medium text-(--ink) hover:bg-(--surface-2) transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-(--border)" />
            <span className="text-[11px] text-(--ink-3) font-medium">ou</span>
            <div className="flex-1 h-px bg-(--border)" />
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-4">
            {aba === 'cadastrar' && (
              <Input
                label="Nome completo"
                placeholder="Seu nome"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                error={errors.nome}
              />
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              error={errors.email}
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                error={errors.senha}
              />
              {aba === 'entrar' && (
                <button
                  type="button"
                  onClick={magicLink}
                  className="text-[12px] text-(--accent) text-right hover:underline"
                >
                  Receber link por e-mail
                </button>
              )}
            </div>

            {aba === 'cadastrar' && (
              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.lgpd}
                    onChange={e => set('lgpd', e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className="text-[12px] text-(--ink-2) leading-relaxed">
                    Li e aceito a{' '}
                    <Link href="/privacidade" className="text-(--accent) hover:underline">Política de Privacidade</Link>
                    {' '}e os{' '}
                    <Link href="/termos" className="text-(--accent) hover:underline">Termos de Uso</Link>
                    {' '}(LGPD)
                  </span>
                </label>
                {errors.lgpd && <span className="text-[12px] text-(--danger)">{errors.lgpd}</span>}
              </div>
            )}

            <Button type="submit" loading={loading} size="md" className="w-full mt-1">
              {aba === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </div>

        <p className="text-[12px] text-(--ink-3) text-center">
          {aba === 'entrar' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button onClick={() => setAba(aba === 'entrar' ? 'cadastrar' : 'entrar')} className="text-(--accent) hover:underline font-medium">
            {aba === 'entrar' ? 'Cadastre-se grátis' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
