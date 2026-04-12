-- =============================================
-- SCHEMA INICIAL — [NOME_APP] CONCURSEIRO
-- Rodar no Supabase SQL Editor
-- =============================================

-- Usuários (extends auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  escolaridade TEXT CHECK (escolaridade IN ('fundamental','medio','superior')),
  areas_interesse TEXT[],
  estados_interesse TEXT[],
  plano TEXT DEFAULT 'free' CHECK (plano IN ('free','premium','elite','avulso')),
  stripe_customer_id TEXT,
  push_subscription JSONB,
  onboarding_completo BOOLEAN DEFAULT FALSE,
  concurso_alvo_id UUID,
  data_prova DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Editais coletados pelo crawler
CREATE TABLE IF NOT EXISTS editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao TEXT NOT NULL,
  cargo TEXT NOT NULL,
  escolaridade TEXT,
  salario NUMERIC,
  vagas INTEGER,
  estado TEXT,
  area TEXT,
  data_inscricao_inicio DATE,
  data_inscricao_fim DATE,
  link_inscricao TEXT NOT NULL,
  link_edital_pdf TEXT,
  banca TEXT,
  fonte TEXT,
  materias JSONB,
  status TEXT DEFAULT 'ativo',
  coletado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(orgao, cargo, data_inscricao_fim)
);

-- Questões do banco
CREATE TABLE IF NOT EXISTS questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id UUID REFERENCES editais(id),
  materia TEXT NOT NULL,
  subtopico TEXT,
  banca TEXT,
  nivel INTEGER CHECK (nivel BETWEEN 1 AND 5),
  enunciado TEXT NOT NULL,
  opcoes JSONB NOT NULL,
  gabarito TEXT NOT NULL,
  explicacao TEXT,
  origem TEXT DEFAULT 'ia' CHECK (origem IN ('real','ia')),
  ativo BOOLEAN DEFAULT TRUE,
  criada_em TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de respostas
CREATE TABLE IF NOT EXISTS respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  questao_id UUID REFERENCES questoes(id),
  edital_id UUID REFERENCES editais(id),
  resposta_dada TEXT,
  correta BOOLEAN,
  tempo_segundos INTEGER,
  respondida_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilidade estimada por matéria (motor IRT)
CREATE TABLE IF NOT EXISTS habilidade_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  theta NUMERIC DEFAULT 0.0,
  incerteza NUMERIC DEFAULT 1.0,
  total_respondidas INTEGER DEFAULT 0,
  total_acertos INTEGER DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, materia)
);

-- Planos de estudo
CREATE TABLE IF NOT EXISTS planos_estudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  edital_id UUID REFERENCES editais(id),
  data_prova DATE,
  dias_restantes INTEGER,
  cronograma JSONB,
  gerado_em TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE
);

-- Editais salvos
CREATE TABLE IF NOT EXISTS editais_salvos (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  edital_id UUID REFERENCES editais(id) ON DELETE CASCADE,
  salvo_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, edital_id)
);

-- Acessos avulsos
CREATE TABLE IF NOT EXISTS acessos_avulso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  edital_id UUID REFERENCES editais(id),
  pago_em TIMESTAMPTZ DEFAULT NOW(),
  stripe_payment_intent TEXT
);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  frente TEXT NOT NULL,
  verso TEXT NOT NULL,
  origem TEXT CHECK (origem IN ('pdf','simulado','manual')),
  materia TEXT,
  ease_factor NUMERIC DEFAULT 2.5,
  intervalo_dias INTEGER DEFAULT 0,
  proxima_revisao DATE DEFAULT CURRENT_DATE,
  total_revisoes INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico do Tutor IA
CREATE TABLE IF NOT EXISTS tutor_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant')),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Materiais (PDFs processados)
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  titulo TEXT,
  resumo TEXT,
  pontos_principais JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting log auxiliar
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip TEXT,
  endpoint TEXT,
  bloqueado BOOLEAN,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_editais_status ON editais(status);
CREATE INDEX IF NOT EXISTS idx_editais_area ON editais(area);
CREATE INDEX IF NOT EXISTS idx_editais_estado ON editais(estado);
CREATE INDEX IF NOT EXISTS idx_editais_data_fim ON editais(data_inscricao_fim);
CREATE INDEX IF NOT EXISTS idx_questoes_materia ON questoes(materia);
CREATE INDEX IF NOT EXISTS idx_questoes_nivel ON questoes(nivel);
CREATE INDEX IF NOT EXISTS idx_questoes_edital ON questoes(edital_id);
CREATE INDEX IF NOT EXISTS idx_respostas_user ON respostas(user_id);
CREATE INDEX IF NOT EXISTS idx_habilidade_user ON habilidade_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_revisao ON flashcards(user_id, proxima_revisao);
CREATE INDEX IF NOT EXISTS idx_tutor_user ON tutor_mensagens(user_id, criado_em);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE habilidade_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_estudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE editais_salvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos_avulso ENABLE ROW LEVEL SECURITY;

-- Policies: usuário vê apenas seus próprios dados
CREATE POLICY "user_own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_own_respostas" ON respostas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_habilidade" ON habilidade_usuario FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_planos" ON planos_estudo FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_salvos" ON editais_salvos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_tutor" ON tutor_mensagens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_materiais" ON materiais FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_avulso" ON acessos_avulso FOR ALL USING (auth.uid() = user_id);

-- Editais e questões são públicas para leitura
CREATE POLICY "editais_public_read" ON editais FOR SELECT USING (true);
CREATE POLICY "questoes_public_read" ON questoes FOR SELECT USING (ativo = true);

-- =============================================
-- TRIGGER: atualiza updated_at em profiles
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- FUNÇÃO: criar profile ao cadastrar usuário
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
