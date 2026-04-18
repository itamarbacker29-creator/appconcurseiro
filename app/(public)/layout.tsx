import Script from 'next/script';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Landing page usa cores hardcoded (design intencional de marketing).
// color-scheme: light garante que o sistema não inverta para dark mode.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ colorScheme: 'light', background: '#ffffff', color: '#0D1117' }}>
      {PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${PIXEL_ID}');
          fbq('track','PageView');
        `}</Script>
      )}
      <Navbar />
      <main className="pt-14 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
