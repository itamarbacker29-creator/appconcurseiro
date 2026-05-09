-- Migration 024: integração com Asaas (checkout web)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plano_iniciado_em      TIMESTAMPTZ DEFAULT NULL;
