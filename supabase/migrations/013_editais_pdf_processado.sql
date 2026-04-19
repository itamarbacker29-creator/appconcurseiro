-- Migration 013: coluna de controle de processamento de PDF por edital
ALTER TABLE editais ADD COLUMN IF NOT EXISTS pdf_processado BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_editais_pdf_pendente ON editais(pdf_processado, coletado_em DESC) WHERE status = 'ativo';
