import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';

const BUCKET = 'apostilas';

// react-pdf uses pdfjs-dist which optionally requires canvas — must be client-only
const ApostilaReader = dynamic(
  () => import('./Reader').then(m => ({ default: m.ApostilaReader })),
  { ssr: false }
);

export default async function ApostilaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: material } = await supabase
    .from('materiais')
    .select('id, titulo, materia, url_storage')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!material) redirect('/apostilas');

  let signedUrl = '';
  if (material.url_storage) {
    const adminClient = createAdminClient();
    const { data } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(material.url_storage, 3600);
    signedUrl = data?.signedUrl ?? '';
  }

  return (
    <ApostilaReader
      materialId={material.id}
      titulo={material.titulo ?? 'Apostila'}
      materia={material.materia}
      signedUrl={signedUrl}
    />
  );
}
