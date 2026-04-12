import type { Metadata, Viewport } from 'next';
import './globals.css';
import { IDENTIDADE } from '@/config/identidade';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    default: `${IDENTIDADE.nomeApp} — ${IDENTIDADE.sloganHero}`,
    template: `%s | ${IDENTIDADE.nomeApp}`,
  },
  description: `Editais automáticos, simulados adaptativos com IA e plano de estudo para concursos públicos. ${IDENTIDADE.slogan}`,
  manifest: '/manifest.json',
  keywords: ['concursos públicos', 'simulado', 'editais', 'plano de estudo', 'IA', 'concurseiro'],
  authors: [{ name: IDENTIDADE.nomeApp, url: `https://${IDENTIDADE.dominioPrincipal}` }],
  creator: IDENTIDADE.nomeApp,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: `https://${IDENTIDADE.dominioApp}`,
    siteName: IDENTIDADE.nomeApp,
    title: `${IDENTIDADE.nomeApp} — ${IDENTIDADE.sloganHero}`,
    description: `Editais automáticos, simulados adaptativos com IA e plano de estudo. ${IDENTIDADE.slogan}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: IDENTIDADE.nomeApp,
    description: IDENTIDADE.slogan,
  },
  appleWebApp: {
    capable: true,
    title: IDENTIDADE.nomeCurto,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: IDENTIDADE.corPrimaria,
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-(--surface) text-(--ink)">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
