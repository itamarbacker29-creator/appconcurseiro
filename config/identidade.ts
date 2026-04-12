// config/identidade.ts
// ARQUIVO GERADO AUTOMATICAMENTE — edite o bloco de identidade no prompt
// e peça ao Claude Code para regenerar este arquivo

export const IDENTIDADE = {
  nomeApp:            process.env.NEXT_PUBLIC_NOME_APP            ?? '[NOME_DO_APP]',
  nomeCurto:          process.env.NEXT_PUBLIC_NOME_CURTO          ?? '[NOME_CURTO]',
  dominioPrincipal:   process.env.NEXT_PUBLIC_DOMINIO             ?? '[DOMINIO]',
  dominioApp:         process.env.NEXT_PUBLIC_DOMINIO_APP         ?? '[DOMINIO_APP]',
  emailContato:       process.env.NEXT_PUBLIC_EMAIL_CONTATO       ?? '[EMAIL_CONTATO]',
  emailSuporte:       process.env.NEXT_PUBLIC_EMAIL_SUPORTE       ?? '[EMAIL_SUPORTE]',
  emailNoreply:       process.env.NEXT_PUBLIC_EMAIL_NOREPLY       ?? '[EMAIL_NOREPLY]',
  slogan:             process.env.NEXT_PUBLIC_SLOGAN              ?? 'Estude menos. Acerte mais.',
  sloganHero:         process.env.NEXT_PUBLIC_SLOGAN_HERO         ?? '[SLOGAN_HERO]',
  corPrimaria:        process.env.NEXT_PUBLIC_COR_PRIMARIA        ?? '#2B3DE8',
  corPrimariaDark:    process.env.NEXT_PUBLIC_COR_PRIMARIA_DARK   ?? '#5B6BFF',
  packageName:        process.env.NEXT_PUBLIC_PACKAGE_NAME        ?? '[PACKAGE]',
  stripePrefix:       process.env.NEXT_PUBLIC_STRIPE_PREFIX       ?? 'estudei_',
} as const;
