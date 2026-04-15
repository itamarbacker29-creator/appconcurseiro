import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover após resolver os problemas
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Variáveis de ambiente críticas
  checks['GEMINI_API_KEY'] = process.env.GEMINI_API_KEY
    ? `SET (${process.env.GEMINI_API_KEY.substring(0, 8)}...)`
    : 'AUSENTE ❌';

  checks['ANTHROPIC_API_KEY'] = process.env.ANTHROPIC_API_KEY
    ? `SET (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)`
    : 'AUSENTE (ok para free)';

  checks['NEXT_PUBLIC_SUPABASE_URL'] = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `SET (${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...)`
    : 'AUSENTE ❌';

  checks['SUPABASE_SERVICE_ROLE_KEY'] = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? 'SET ✓'
    : 'AUSENTE ❌';

  checks['SUPABASE_SERVICE_KEY'] = process.env.SUPABASE_SERVICE_KEY
    ? 'SET ✓'
    : 'não definida (tudo bem se SERVICE_ROLE_KEY estiver set)';

  // 2. Testar Supabase admin client
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('editais').select('id').limit(1);
    if (error) throw error;
    checks['supabase_admin'] = `OK — ${data?.length ?? 0} editais lidos`;
  } catch (e) {
    checks['supabase_admin'] = `ERRO ❌: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Testar Gemini
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const resp = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Responda apenas: OK',
    });
    checks['gemini_api'] = `OK — resposta: "${resp.text?.substring(0, 30)}"`;
  } catch (e) {
    checks['gemini_api'] = `ERRO ❌: ${e instanceof Error ? e.message.substring(0, 120) : String(e)}`;
  }

  // 4. Testar Anthropic (se configurado)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Responda: OK' }],
      });
      const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '?';
      checks['anthropic_api'] = `OK — resposta: "${text}"`;
    } catch (e) {
      checks['anthropic_api'] = `ERRO ❌: ${e instanceof Error ? e.message.substring(0, 120) : String(e)}`;
    }
  } else {
    checks['anthropic_api'] = 'PULADO (chave não configurada)';
  }

  // 5. Info do ambiente
  checks['node_version'] = process.version;
  checks['next_version'] = '16.2.3';

  return NextResponse.json({ status: 'diagnostico', checks }, { status: 200 });
}
