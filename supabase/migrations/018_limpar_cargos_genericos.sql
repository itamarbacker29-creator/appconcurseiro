-- Remove editais com cargo genérico que não têm valor real para o concurseiro
DELETE FROM editais
WHERE lower(trim(cargo)) IN ('diversos', 'vários cargos', 'varios cargos', 'vários', 'varios');
