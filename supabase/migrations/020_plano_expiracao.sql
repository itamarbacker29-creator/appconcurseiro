-- Migration 020: expiração automática de planos temporários
-- Adiciona coluna plano_expira_em e promove beta testers para Elite por 14 dias

-- 1. Coluna de expiração
alter table profiles
  add column if not exists plano_expira_em timestamptz default null;

-- 2. Função que rebaixa planos vencidos para 'free'
create or replace function rebaixar_planos_expirados()
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set plano = 'free',
      plano_expira_em = null
  where plano_expira_em is not null
    and plano_expira_em < now();
end;
$$;

-- 3. Agendar execução diária via pg_cron (requer extensão pg_cron no Supabase)
-- Ative em: Dashboard → Database → Extensions → pg_cron
select cron.schedule(
  'rebaixar-planos-expirados',   -- nome do job
  '0 3 * * *',                   -- todo dia às 03:00 UTC
  'select rebaixar_planos_expirados()'
);

-- 4. Promover todos os beta testers para Elite por 14 dias
update profiles p
set plano = 'elite',
    plano_expira_em = now() + interval '14 days'
from auth.users u
where p.id = u.id
  and u.email in (
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
  );
