-- =============================================
-- MIGRATION 002 — adiciona cidade e nivel em editais
-- Rodar no Supabase SQL Editor
-- =============================================

-- Adiciona campo cidade (pode ser nulo para concursos nacionais)
ALTER TABLE editais ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Adiciona esfera: federal, estadual ou municipal
ALTER TABLE editais ADD COLUMN IF NOT EXISTS nivel TEXT
  CHECK (nivel IN ('federal','estadual','municipal'));

-- Índice para filtrar por cidade
CREATE INDEX IF NOT EXISTS idx_editais_cidade ON editais(cidade);
CREATE INDEX IF NOT EXISTS idx_editais_nivel  ON editais(nivel);

-- Limpa todos os dados anteriores (crawlados sem filtro Gemini — dados ruins)
DELETE FROM editais;
