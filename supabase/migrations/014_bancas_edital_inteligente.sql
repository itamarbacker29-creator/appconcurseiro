-- Migration 014: tabela bancas + colunas ricas em editais + elegibilidade em profiles

-- ─────────────────────────────────────────────
-- TABELA BANCAS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bancas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL UNIQUE,
  nome_alternativo  TEXT[] DEFAULT '{}',
  perfil_resumido   TEXT NOT NULL,
  caracteristicas   JSONB NOT NULL DEFAULT '{}',
  dica_estudo       TEXT NOT NULL,
  nivel_dificuldade TEXT CHECK (nivel_dificuldade IN ('alto', 'médio', 'baixo')),
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bancas_public_read" ON bancas FOR SELECT USING (true);

INSERT INTO bancas (nome, nome_alternativo, perfil_resumido, caracteristicas, dica_estudo, nivel_dificuldade)
VALUES
(
  'CESPE/CEBRASPE',
  ARRAY['CESPE','CEBRASPE','Centro Brasileiro de Pesquisa e Avaliação'],
  'Questões certo/errado com afirmações complexas. Alta taxa de pegadinhas em detalhes de lei e jurisprudência. Exige leitura literal e atenção a advérbios como "sempre", "nunca", "apenas".',
  '{"estilo":"Certo ou Errado","pegadinhas":"muito alto","legislacao_literal":true,"jurisprudencia":true,"atualidades":"médio","interdisciplinaridade":"alto"}',
  'Treine questões CESPE com foco em advérbios absolutos. Uma palavra muda tudo. Priorize lei seca e súmulas dos tribunais superiores.',
  'alto'
),
(
  'FGV',
  ARRAY['Fundação Getulio Vargas'],
  'Múltipla escolha com foco em raciocínio e interpretação. Questões mais longas e elaboradas. Cobra doutrina além de lei — exige compreensão, não apenas memorização.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"médio","legislacao_literal":false,"jurisprudencia":true,"atualidades":"alto","interdisciplinaridade":"muito alto"}',
  'Para FGV, não basta decorar lei — entenda o princípio por trás. Treine interpretação de textos jurídicos e leia editoriais de jornais para atualidades.',
  'alto'
),
(
  'VUNESP',
  ARRAY['Fundação para o Vestibular da UNESP','Vunesp'],
  'Questões objetivas e diretas. Foco em lei seca e conceitos clássicos. Menos pegadinhas que CESPE. Boa para quem domina o conteúdo básico.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"baixo","legislacao_literal":true,"jurisprudencia":"médio","atualidades":"baixo","interdisciplinaridade":"médio"}',
  'VUNESP valoriza quem domina a lei seca. Invista em memorização dos artigos-chave. Menos improviso — mais conteúdo sólido.',
  'médio'
),
(
  'CESGRANRIO',
  ARRAY['Fundação Cesgranrio'],
  'Questões técnicas e bem estruturadas, especialmente para área fiscal e bancária. Alto rigor técnico. Cobra muito Contabilidade e Economia em concursos bancários.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"médio","legislacao_literal":false,"jurisprudencia":"baixo","atualidades":"médio","interdisciplinaridade":"alto"}',
  'Para Cesgranrio, domine os fundamentos técnicos da área. Em concursos bancários, foque em Matemática Financeira, Contabilidade e Atendimento.',
  'médio'
),
(
  'IBFC',
  ARRAY['Instituto Brasileiro de Formação e Capacitação'],
  'Questões diretas com foco em lei seca. Nível médio de dificuldade. Muito cobrado em concursos policiais e da área de saúde.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"baixo","legislacao_literal":true,"jurisprudencia":"baixo","atualidades":"baixo","interdisciplinaridade":"baixo"}',
  'IBFC é direta ao ponto. Domine os artigos mais cobrados da legislação específica do cargo e foque em Português e Legislação.',
  'médio'
),
(
  'CONSULPLAN',
  ARRAY['Consulplan'],
  'Foco em lei seca e questões objetivas. Muito presente em concursos de saúde e administrativos. Nível acessível para quem estuda com regularidade.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"baixo","legislacao_literal":true,"jurisprudencia":"baixo","atualidades":"baixo","interdisciplinaridade":"baixo"}',
  'Para Consulplan, consistência é mais importante que profundidade. Cubra bem todas as matérias do edital sem lacunas.',
  'médio'
),
(
  'IADES',
  ARRAY['Instituto Americano de Desenvolvimento'],
  'Questões de nível intermediário com bom equilíbrio entre lei e doutrina. Presente em concursos federais e do DF. Cobra atualidades com frequência.',
  '{"estilo":"Múltipla escolha 5 alternativas","pegadinhas":"médio","legislacao_literal":true,"jurisprudencia":"médio","atualidades":"alto","interdisciplinaridade":"médio"}',
  'IADES exige atenção às atualidades — leia o noticiário público regularmente. Combine estudo de lei com leitura de informativos dos tribunais.',
  'médio'
),
(
  'QUADRIX',
  ARRAY['Quadrix'],
  'Estilo próximo ao CESPE — questões certo/errado com afirmações elaboradas. Muito cobrado em conselhos profissionais (CRM, CREA, CRO). Exige atenção a detalhes.',
  '{"estilo":"Certo ou Errado","pegadinhas":"alto","legislacao_literal":true,"jurisprudencia":"médio","atualidades":"baixo","interdisciplinaridade":"médio"}',
  'Quadrix tem estilo CESPE — treine a leitura crítica de afirmações. Foque na legislação específica do conselho que está prestando.',
  'alto'
)
ON CONFLICT (nome) DO NOTHING;

-- ─────────────────────────────────────────────
-- NOVAS COLUNAS EM EDITAIS
-- ─────────────────────────────────────────────
ALTER TABLE editais
  ADD COLUMN IF NOT EXISTS taxa_inscricao            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS isencao_taxa              JSONB,
  ADD COLUMN IF NOT EXISTS formacao_exigida          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS registro_conselho_exigido TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cotas                     JSONB,
  ADD COLUMN IF NOT EXISTS local_prova               TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS etapas                    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cargos                    JSONB;

-- ─────────────────────────────────────────────
-- ELEGIBILIDADE EM PROFILES
-- ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS formacao                    TEXT,
  ADD COLUMN IF NOT EXISTS registros_conselho          TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pcd                         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elegivel_cota_racial        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elegivel_cota_indigena      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elegivel_cota_quilombola    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elegivel_isencao_taxa       BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bancas_nome ON bancas(nome);
