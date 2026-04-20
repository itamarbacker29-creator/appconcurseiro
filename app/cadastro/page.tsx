import { redirect } from 'next/navigation';

export default function CadastroPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const params = new URLSearchParams();
  if (searchParams.utm_source) params.set('utm_source', searchParams.utm_source);
  if (searchParams.utm_medium) params.set('utm_medium', searchParams.utm_medium);
  if (searchParams.utm_campaign) params.set('utm_campaign', searchParams.utm_campaign);
  if (searchParams.ref) params.set('ref', searchParams.ref);

  const query = params.toString();
  redirect(`/${query ? `?${query}` : ''}`);
}
