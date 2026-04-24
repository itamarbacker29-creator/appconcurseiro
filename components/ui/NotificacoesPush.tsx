'use client';

import { useState, useEffect } from 'react';

type Status = 'carregando' | 'nao-suportado' | 'negado' | 'ativo' | 'inativo';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buf;
}

export function NotificacoesPush() {
  const [status, setStatus] = useState<Status>('carregando');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('nao-suportado');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') { setStatus('negado'); return; }

    // Registra SW se ainda não foi registrado
    navigator.serviceWorker.register('/sw-custom.js', { scope: '/' }).catch(() => {});

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setStatus(sub ? 'ativo' : 'inativo');
      });
    }).catch(() => setStatus('inativo'));
  }, []);

  async function ativar() {
    if (!('serviceWorker' in navigator)) return;
    setCarregando(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('negado'); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setStatus('ativo');
    } catch (err) {
      console.error('[push] erro ao ativar:', err);
    } finally {
      setCarregando(false);
    }
  }

  async function desativar() {
    setCarregando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setStatus('inativo');
    } catch (err) {
      console.error('[push] erro ao desativar:', err);
    } finally {
      setCarregando(false);
    }
  }

  if (status === 'carregando') return null;

  if (status === 'nao-suportado') {
    return (
      <p className="text-[12px] text-(--ink-3)">
        Seu navegador não suporta notificações push. Use Chrome, Edge ou Firefox no desktop.
      </p>
    );
  }

  if (status === 'negado') {
    return (
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-(--danger) shrink-0 mt-0.5">notifications_off</span>
        <p className="text-[12px] text-(--ink-3)">
          Notificações bloqueadas no navegador. Para reativar, clique no cadeado na barra de endereço e permita notificações.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className={`material-symbols-outlined text-[20px] ${status === 'ativo' ? 'text-success filled' : 'text-(--ink-3)'}`}>
          notifications
        </span>
        <div>
          <p className="text-[13px] font-medium text-(--ink)">
            {status === 'ativo' ? 'Notificações ativas' : 'Notificações desativadas'}
          </p>
          <p className="text-[11px] text-(--ink-3)">
            {status === 'ativo'
              ? 'Você receberá lembretes diários e alertas de novos editais.'
              : 'Ative para receber lembretes diários de estudo e alertas de editais.'}
          </p>
        </div>
      </div>

      <button
        onClick={status === 'ativo' ? desativar : ativar}
        disabled={carregando}
        className={`shrink-0 px-3 py-1.5 rounded-(--radius-sm) text-[12px] font-semibold transition-all disabled:opacity-50 ${
          status === 'ativo'
            ? 'border border-(--border-strong) text-(--ink-3) hover:text-(--danger) hover:border-(--danger)'
            : 'bg-brand-navy text-white hover:opacity-90'
        }`}
      >
        {carregando ? '...' : status === 'ativo' ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  );
}
