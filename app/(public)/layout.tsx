import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Landing page usa cores hardcoded (design intencional de marketing).
// color-scheme: light garante que o sistema não inverta para dark mode.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ colorScheme: 'light', background: '#ffffff', color: '#0D1117' }}>
      <Navbar />
      <main className="pt-14 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
