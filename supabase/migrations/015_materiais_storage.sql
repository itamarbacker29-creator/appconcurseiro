-- Migration 015: apostilas — adiciona campos de storage e metadados à tabela materiais

ALTER TABLE materiais
  ADD COLUMN IF NOT EXISTS url_storage    TEXT,
  ADD COLUMN IF NOT EXISTS edital_id      UUID REFERENCES editais(id),
  ADD COLUMN IF NOT EXISTS materia        TEXT,
  ADD COLUMN IF NOT EXISTS tamanho_bytes  INTEGER,
  ADD COLUMN IF NOT EXISTS processado     BOOLEAN DEFAULT FALSE;

-- Índice para listar apostilas do usuário ordenadas por data
CREATE INDEX IF NOT EXISTS idx_materiais_user_criado
  ON materiais(user_id, criado_em DESC);
