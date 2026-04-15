import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// gemini-1.5-flash não existe na API v1 do @google/genai >= 1.x
// gemini-2.0-flash é o modelo correto para esta versão do SDK
const MODELOS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
          await sleep(10_000);
          continue;
        }
        if (isQuota) break; // tenta próximo modelo
        throw err; // erro não-quota — propaga
      }
    }
  }
  throw new Error('Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.');
}
