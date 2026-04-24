'use client';

import dynamic from 'next/dynamic';

interface Props {
  materialId: string;
  titulo: string;
  materia: string | null;
  signedUrl: string;
}

const ApostilaReaderDynamic = dynamic(
  () => import('./Reader').then(m => ({ default: m.ApostilaReader })),
  { ssr: false }
);

export function ReaderWrapper(props: Props) {
  return <ApostilaReaderDynamic {...props} />;
}
