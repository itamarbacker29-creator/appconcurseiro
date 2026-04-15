/**
 * lib/ai/index.ts
 * Ponto de entrada unificado para geração de texto com IA.
 * Seleciona automaticamente o modelo com base no plano do usuário:
 *   free        → Gemini 1.5 Flash  (custo zero)
 *   premium     → Claude Haiku 4.5  (mais preciso)
 *   elite       → Claude Haiku 4.5  (ilimitado)
 *   avulso      → Claude Haiku 4.5
 */

import Anthropic from '@anthropic-ai/sdk';
import { gerarTextoGemini } from '@/lib/gemini';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODELO_HAIKU = 'claude-haiku-4-5-20251001';

export type PlanoIA = 'free' | 'premium' | 'elite' | 'avulso';

function usaHaiku(plano: PlanoIA): boolean {
  return plano !== 'free';
}

/**
 * Gera texto com o modelo adequado ao plano.
 * Se Claude falhar (chave ausente, erro de API), faz fallback para Gemini.
 */
export async function gerarTexto(
  prompt: string,
  plano: PlanoIA,
  systemPrompt?: string,
): Promise<string> {
  if (usaHaiku(plano)) {
    try {
      return await gerarTextoHaiku(prompt, systemPrompt);
    } catch (err) {
      console.warn('[ai] Claude falhou, usando Gemini como fallback:', err);
      return gerarTextoGemini(prompt);
    }
  }
  return gerarTextoGemini(prompt);
}

/**
 * Gera texto com Claude Haiku, com prompt caching no system prompt.
 */
export async function gerarTextoHaiku(
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const systemContent: Anthropic.Messages.TextBlockParam[] = systemPrompt
    ? [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ]
    : [];

  const response = await anthropic.messages.create({
    model: MODELO_HAIKU,
    max_tokens: 2048,
    ...(systemContent.length > 0 && { system: systemContent }),
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type === 'text') return block.text;
  return '';
}

// Prefixo especial para erros enviados pelo stream — detectado pelo cliente
export const STREAM_ERROR_PREFIX = '__ERRO__:';

/**
 * Streaming com Claude Haiku — para o chat do Tutor.
 * Retorna um ReadableStream compatível com Response do Next.js.
 * Se a API falhar, envia mensagem de erro legível pelo stream em vez de crashar.
 */
export function streamHaiku(
  mensagens: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: MODELO_HAIKU,
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: mensagens,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[streamHaiku] Erro:', msg);
        // Envia erro como texto no stream para o cliente detectar
        controller.enqueue(encoder.encode(`${STREAM_ERROR_PREFIX}${msg}`));
      } finally {
        controller.close();
      }
    },
  });
}
