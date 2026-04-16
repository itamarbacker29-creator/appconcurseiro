-- =============================================
-- MIGRATION 004 — data da prova no edital
-- Rodar no Supabase SQL Editor
-- =============================================

ALTER TABLE editais ADD COLUMN IF NOT EXISTS data_prova DATE;
