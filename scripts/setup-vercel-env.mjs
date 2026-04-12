/**
 * setup-vercel-env.mjs
 * Lê o .env.local e envia todas as variáveis para o projeto no Vercel via API.
 *
 * Uso:
 *   node scripts/setup-vercel-env.mjs <VERCEL_TOKEN> <PROJECT_ID>
 *
 * Como obter:
 *   VERCEL_TOKEN  → vercel.com/account/tokens → "Create Token"
 *   PROJECT_ID    → vercel.com/<seu-user>/<projeto> → Settings → General → "Project ID"
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(__dir, '../.env.local');

const [,, VERCEL_TOKEN, PROJECT_ID] = process.argv;

if (!VERCEL_TOKEN || !PROJECT_ID) {
  console.error('Uso: node scripts/setup-vercel-env.mjs <VERCEL_TOKEN> <PROJECT_ID>');
  process.exit(1);
}

// Variáveis que NÃO devem ser enviadas (placeholders ou vazias)
const SKIP_VALUES = ['[NOME_DO_APP]', '[NOME_CURTO]', '[DOMINIO]', '[DOMINIO_APP]', '[EMAIL]', '[SLOGAN_HERO]', ''];

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().split('#')[0].trim(); // remove comentário inline
    vars[key] = val;
  }
  return vars;
}

async function upsertEnvVar(key, value, target = ['production', 'preview', 'development']) {
  // Tenta criar; se já existir (409), atualiza
  const body = { key, value, type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted', target };

  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    // Já existe — busca o ID e faz PATCH
    const listRes = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env?decrypt=false`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    const { envs } = await listRes.json();
    const existing = envs?.find(e => e.key === key);
    if (existing) {
      await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${existing.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, type: body.type, target }),
      });
      return 'updated';
    }
  }

  return res.ok ? 'created' : `erro ${res.status}`;
}

async function main() {
  const content = readFileSync(ENV_FILE, 'utf-8');
  const vars = parseEnv(content);

  console.log(`\n📦 Enviando variáveis para o projeto ${PROJECT_ID}...\n`);

  for (const [key, value] of Object.entries(vars)) {
    if (SKIP_VALUES.includes(value)) {
      console.log(`  ⏭  ${key} — ignorado (placeholder ou vazio)`);
      continue;
    }
    const status = await upsertEnvVar(key, value);
    const icon = status === 'created' ? '✅' : status === 'updated' ? '🔄' : '❌';
    console.log(`  ${icon} ${key} — ${status}`);
  }

  console.log('\n✓ Concluído! Acesse o Vercel e clique em Redeploy.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
