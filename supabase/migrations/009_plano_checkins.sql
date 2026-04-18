-- Migration 009: check-ins diários, cache de buscas sugeridas e histórico de aprovados

-- Check-ins diários de dificuldade
CREATE TABLE IF NOT EXISTS checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  nivel       TEXT NOT NULL CHECK (nivel IN ('dificil', 'ok', 'tranquilo')),
  materia     TEXT,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_data ON checkins(user_id, data DESC);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_own" ON checkins FOR ALL USING (auth.uid() = user_id);

-- Cache de buscas sugeridas por matéria/tópico (evita chamar IA a cada render)
CREATE TABLE IF NOT EXISTS busca_sugerida_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia     TEXT NOT NULL,
  topico      TEXT NOT NULL,
  busca       TEXT NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (materia, topico)
);

-- Histórico de desempenho de aprovados por matéria (seed manual ou via crawler)
CREATE TABLE IF NOT EXISTS historico_aprovados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso          TEXT NOT NULL,
  banca             TEXT,
  materia           TEXT NOT NULL,
  percentual_medio  NUMERIC NOT NULL CHECK (percentual_medio BETWEEN 0 AND 100),
  fonte             TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_aprovados_concurso ON historico_aprovados(concurso);

-- Seed básico de referência: desempenho típico de aprovados nas matérias mais comuns
INSERT INTO historico_aprovados (concurso, banca, materia, percentual_medio, fonte) VALUES
  ('Geral', 'CEBRASPE', 'Português',               72, 'referencia'),
  ('Geral', 'CEBRASPE', 'Direito Constitucional',  68, 'referencia'),
  ('Geral', 'CEBRASPE', 'Direito Administrativo',  65, 'referencia'),
  ('Geral', 'CEBRASPE', 'Raciocínio Lógico',       60, 'referencia'),
  ('Geral', 'CEBRASPE', 'Informática',              65, 'referencia'),
  ('Geral', 'FGV',      'Português',               75, 'referencia'),
  ('Geral', 'FGV',      'Direito Constitucional',  70, 'referencia'),
  ('Geral', 'FGV',      'Direito Administrativo',  68, 'referencia'),
  ('Geral', 'FGV',      'Raciocínio Lógico',       63, 'referencia'),
  ('Geral', 'FCC',      'Português',               70, 'referencia'),
  ('Geral', 'FCC',      'Direito Constitucional',  66, 'referencia'),
  ('Geral', 'FCC',      'Direito Administrativo',  63, 'referencia'),
  ('Geral', 'FCC',      'Raciocínio Lógico',       58, 'referencia')
ON CONFLICT DO NOTHING;
