create table if not exists feedbacks_beta (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  nome        text,
  email       text,
  respostas   jsonb not null default '{}'::jsonb,
  screenshot_url text
);

alter table feedbacks_beta enable row level security;

-- Apenas service_role pode ler (admin)
create policy "service_role_all" on feedbacks_beta
  for all using (auth.role() = 'service_role');

-- Qualquer pessoa pode inserir (público)
create policy "public_insert" on feedbacks_beta
  for insert with check (true);
