-- Migration 017: remove editais sem dados úteis
-- Critério: cargo = 'Vários cargos' E sem entrada na tabela cargos
-- Esses serão re-inseridos corretamente pelo próximo crawl (um por cargo).

DELETE FROM editais
WHERE cargo = 'Vários cargos'
  AND id NOT IN (SELECT DISTINCT edital_id FROM cargos WHERE edital_id IS NOT NULL);
