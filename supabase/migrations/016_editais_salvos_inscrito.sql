-- Adiciona campo para o candidato indicar se se inscreveu no concurso
ALTER TABLE editais_salvos
  ADD COLUMN IF NOT EXISTS inscrito BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN editais_salvos.inscrito IS
  'true = candidato confirmou que realizou a inscrição no concurso';
