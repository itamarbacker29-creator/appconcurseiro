-- 012: separa link_fonte (onde coletamos) de link_inscricao (portal oficial do órgão)
-- link_inscricao fica reservado para o URL oficial de inscrição (atualizado manualmente ou por scraper)
-- link_fonte armazena a origem (PCI Concursos, etc.) que é o que temos hoje em link_inscricao

ALTER TABLE editais ADD COLUMN IF NOT EXISTS link_fonte TEXT;

-- Remove a constraint NOT NULL para permitir link_inscricao vazio quando não há portal oficial
ALTER TABLE editais ALTER COLUMN link_inscricao DROP NOT NULL;

-- Move o conteúdo atual de link_inscricao para link_fonte
-- (o que temos hoje são URLs do PCI Concursos, não portais oficiais)
UPDATE editais
SET link_fonte = link_inscricao
WHERE link_fonte IS NULL AND link_inscricao IS NOT NULL;

-- Zera link_inscricao apenas para registros onde é um URL de agregador
-- Mantém registros que já apontam para portais oficiais (gov.br, etc.)
UPDATE editais
SET link_inscricao = NULL
WHERE link_inscricao IS NOT NULL
  AND (
    link_inscricao LIKE '%pciconcursos.com.br%'
    OR link_inscricao LIKE '%concursosnobrasil.com.br%'
    OR link_inscricao LIKE '%concursospublicos.com.br%'
    OR link_inscricao LIKE '%qconcursos.com%'
    OR link_inscricao LIKE '%estrategiaconcursos.com.br%'
  );
