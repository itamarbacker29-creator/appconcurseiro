-- Migration 011: formatos_preferidos em profiles + questoes_por_dia + trigger ajustar_ritmo

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS formatos_preferidos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS questoes_por_dia    INTEGER DEFAULT 15;

-- Trigger: ajusta questoes_por_dia quando 3 check-ins seguidos = mesmo nível
CREATE OR REPLACE FUNCTION ajustar_ritmo_checkin()
RETURNS TRIGGER AS $$
DECLARE
  ultimos_3 TEXT[];
BEGIN
  SELECT ARRAY_AGG(nivel ORDER BY data DESC)
  INTO ultimos_3
  FROM (
    SELECT nivel, data
    FROM checkins
    WHERE user_id = NEW.user_id
    ORDER BY data DESC
    LIMIT 3
  ) sub;

  IF array_length(ultimos_3, 1) = 3
     AND ultimos_3[1] = 'dificil'
     AND ultimos_3[2] = 'dificil'
     AND ultimos_3[3] = 'dificil' THEN
    UPDATE profiles
    SET questoes_por_dia = GREATEST(5, ROUND(COALESCE(questoes_por_dia, 15) * 0.8))
    WHERE id = NEW.user_id;
  END IF;

  IF array_length(ultimos_3, 1) = 3
     AND ultimos_3[1] = 'tranquilo'
     AND ultimos_3[2] = 'tranquilo'
     AND ultimos_3[3] = 'tranquilo' THEN
    UPDATE profiles
    SET questoes_por_dia = LEAST(40, ROUND(COALESCE(questoes_por_dia, 15) * 1.2))
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ajustar_ritmo ON checkins;
CREATE TRIGGER trigger_ajustar_ritmo
  AFTER INSERT ON checkins
  FOR EACH ROW EXECUTE FUNCTION ajustar_ritmo_checkin();
