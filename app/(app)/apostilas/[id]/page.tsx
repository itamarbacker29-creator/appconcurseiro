import { redirect } from 'next/navigation';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { ReaderWrapper } from './ReaderWrapper';

const BUCKET = 'apostilas';

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
    <ReaderWrapper
      materialId={material.id}
      titulo={material.titulo ?? 'Apostila'}
      materia={material.materia}
      signedUrl={signedUrl}
    />
  );
}
