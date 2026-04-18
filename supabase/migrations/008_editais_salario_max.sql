-- Migration 008: salario_max e índice em data_prova

ALTER TABLE editais ADD COLUMN IF NOT EXISTS salario_max NUMERIC;
ALTER TABLE editais ADD COLUMN IF NOT EXISTS salario_min NUMERIC;

CREATE INDEX IF NOT EXISTS idx_editais_data_prova  ON editais(data_prova);
CREATE INDEX IF NOT EXISTS idx_editais_banca       ON editais(banca);
CREATE INDEX IF NOT EXISTS idx_editais_nivel       ON editais(nivel);
CREATE INDEX IF NOT EXISTS idx_editais_coletado    ON editais(coletado_em DESC);
