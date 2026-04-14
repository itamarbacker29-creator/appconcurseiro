import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Modelos em ordem de preferência — gemini-1.5-flash tem cota separada de gemini-2.0-flash
const MODELOS = ['gemini-1.5-flash', 'gemini-2.0-flash'];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gera conteúdo de texto com retry automático em caso de quota (429)
export async function gerarTextoGemini(prompt: string): Promise<string> {
  for (const modelo of MODELOS) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const response = await ai.models.generateContent({
          model: modelo,
          contents: prompt,
        });
        return response.text ?? '';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
        if (isQuota && tentativa === 0) {
          // Aguarda 10s e tenta novamente com o mesmo modelo
          await sleep(10_000);
          continue;
        }
        if (isQuota) {
          // Esgotou retries neste modelo — tenta o próximo
          break;
        }
        // Erro não-quota — propaga imediatamente
        throw err;
      }
    }
  }
  throw new Error('Serviço de IA temporariamente indisponível (cota excedida). Tente novamente em alguns minutos.');
}
