-- Migration 005: composite indices for questoes + origem prioritization
-- Optimizes the simulado query: materia + nivel + ativo + origem

-- Composite index: the exact filter pattern used by /api/simulado/gerar
CREATE INDEX IF NOT EXISTS idx_questoes_materia_nivel_ativo
  ON questoes(materia, nivel, ativo)
  WHERE ativo = TRUE;

-- Partial index for real questions — used to check if real questions exist first
CREATE INDEX IF NOT EXISTS idx_questoes_real
  ON questoes(materia, nivel)
  WHERE ativo = TRUE AND origem = 'real';

-- Index for subtopico — used by seed script to check existing counts
CREATE INDEX IF NOT EXISTS idx_questoes_subtopico
  ON questoes(materia, subtopico)
  WHERE ativo = TRUE;

-- Index for origem — used when filtering by source
CREATE INDEX IF NOT EXISTS idx_questoes_origem
  ON questoes(origem)
  WHERE ativo = TRUE;
