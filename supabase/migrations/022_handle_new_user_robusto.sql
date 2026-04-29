-- Migration 022: torna o trigger handle_new_user tolerante a falhas.
-- Adiciona ON CONFLICT DO NOTHING e bloco EXCEPTION para que erros no trigger
-- nunca bloqueiem o cadastro do usuário.

create or replace function handle_new_user()
returns trigger as $$
declare
  v_plano text := 'free';
  v_expira timestamptz := null;
  v_beta_emails text[] := array[
    'adam.evelyn@yahoo.com.br',
    'agnaldomarttins@gmail.com',
    'alex.ribeiro01071985@gmail.com',
    'alzenirp444@gmail.com',
    'apbdireito@yahoo.com.br',
    'argel.maycon.g@gmail.com',
    'carolbiologia93@gmail.com',
    'catiaanajulia.enzo@gmail.com',
    'catialuciaedilenethome@gmail.com',
    'cicerotse@gmail.com',
    'dalvamoro63@gmail.com',
    'danyelafps@gmail.com',
    'edsonpla22@gmail.com',
    'erlaniaf@gmail.com',
    'etbpmce22@gmail.com',
    'fc9421625@gmail.com',
    'hermesonalvez@gmail.com',
    'iranilima651@gmail.com',
    'ismael.carmo1@gmail.com',
    'itamar.backer29@gmail.com',
    'jazevedosalgado@gmail.com',
    'jeffcarlim@yahoo.com.br',
    'josineyja@gmail.com',
    'karolsinha28@hotmail.com',
    'kfiock@outlook.com',
    'lcrptc1974@gmail.com',
    'limoiano@gmail.com',
    'lisycristina@hotmail.com',
    'luzienevelozo202412@gmail.com',
    'marcelo242780@gmail.com',
    'marciagabriela1970@gmail.com',
    'marciagabrielasantana@gmail.com',
    'marcosrobertoappeldeoliveira@gmail.com',
    'marlizanardini@gmail.com',
    'mocambitepereira2025@gmail.com',
    'nerivaldosantos2011@gmail.com',
    'rachelcpinheiro@yahoo.com.br',
    'raicram14@gmail.com',
    'raicram1@hotmail.com',
    'rogeriofutema@gmail.com',
    'rogeriorf0812@gmail.com',
    'silvanymoreira68@gmail.com',
    'sjoseantoniof65@gmail.com',
    'ssdiasdafraga@gmail.com',
    'sulamitadeoliveira420@gmail.com',
    'susys9129@gmail.com',
    'tarapanoff.alessandra@gmail.com',
    'terezaadv1957@gmail.com',
    'vanessa.clg22@gmail.com',
    'velhopereiraaugustaluzia@gmail.com',
    'uredaj@gmail.com',
    'analuciadavo@hotmail.com',
    'churchsagui@yahoo.com',
    'dalvamoro@outlook.com',
    'franjaekel@yahoo.com.br',
    'susula01@hotmail.com',
    'thiagosilva376@yahoo.com.br'
  ];
begin
  if new.email is not null and lower(new.email) = any(v_beta_emails) then
    v_plano  := 'elite';
    v_expira := now() + interval '14 days';
  end if;

  insert into public.profiles (id, nome, plano, plano_expira_em)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    v_plano,
    v_expira
  )
  on conflict (id) do nothing;

  return new;

exception when others then
  -- Nunca bloquear o cadastro por erro no trigger
  raise warning '[handle_new_user] erro ao criar profile para %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;
