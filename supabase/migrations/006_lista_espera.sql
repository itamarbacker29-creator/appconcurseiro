-- Migration 006: tabela lista de espera para pré-lançamento

CREATE TABLE IF NOT EXISTS lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  origem TEXT DEFAULT 'landing',
  cargo_interesse TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  notificado BOOLEAN DEFAULT FALSE,
  posicao INTEGER GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_email ON lista_espera(email);
CREATE INDEX IF NOT EXISTS idx_lista_espera_posicao ON lista_espera(posicao);

-- RLS: qualquer pessoa pode se cadastrar, ninguém lê
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lista_espera_insert" ON lista_espera;
CREATE POLICY "lista_espera_insert" ON lista_espera
  FOR INSERT WITH CHECK (true);
