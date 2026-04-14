-- =============================================
-- MIGRATION 003 — estilos de aprendizado e nome do concurso alvo
-- Rodar no Supabase SQL Editor
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estilos_aprendizado TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS concurso_alvo_nome TEXT;
