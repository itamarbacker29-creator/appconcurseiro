-- Migration 010: UTM tracking na lista_espera

ALTER TABLE lista_espera
  ADD COLUMN IF NOT EXISTS utm_source   TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
