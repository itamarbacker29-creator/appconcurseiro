-- Migration 007: sistema de indicação (referral) na lista_espera

ALTER TABLE lista_espera
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS indicado_por UUID REFERENCES lista_espera(id),
  ADD COLUMN IF NOT EXISTS total_indicacoes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beneficio TEXT DEFAULT 'padrao';

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON lista_espera(referral_code);

-- Gera código de 8 caracteres sem caracteres ambíguos
CREATE OR REPLACE FUNCTION gerar_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger: atribui referral_code único antes de inserir
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      NEW.referral_code := gerar_referral_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM lista_espera WHERE referral_code = NEW.referral_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_code ON lista_espera;
CREATE TRIGGER trigger_referral_code
  BEFORE INSERT ON lista_espera
  FOR EACH ROW EXECUTE FUNCTION set_referral_code();

-- Trigger: incrementa contador e sobe benefício do indicador
CREATE OR REPLACE FUNCTION atualizar_indicador()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.indicado_por IS NOT NULL THEN
    UPDATE lista_espera
    SET
      total_indicacoes = total_indicacoes + 1,
      beneficio = CASE
        WHEN total_indicacoes + 1 >= 10 THEN '6meses'
        WHEN total_indicacoes + 1 >= 5  THEN '3meses_garantido'
        WHEN total_indicacoes + 1 >= 3  THEN 'top20'
        ELSE beneficio
      END
    WHERE id = NEW.indicado_por;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_indicador ON lista_espera;
CREATE TRIGGER trigger_atualizar_indicador
  AFTER INSERT ON lista_espera
  FOR EACH ROW EXECUTE FUNCTION atualizar_indicador();

-- Gerar referral_code para entradas já existentes
UPDATE lista_espera SET referral_code = gerar_referral_code() WHERE referral_code IS NULL;
