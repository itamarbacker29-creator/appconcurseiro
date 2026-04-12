import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Free tier: 15 req/min, 1.500 req/dia
// Paid: $0,10/1M tokens input, $0,40/1M tokens output
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
