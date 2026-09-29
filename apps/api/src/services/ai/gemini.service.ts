import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      if (!env.googleGenAiApiKey) {
        throw new Error('Gemini API key is not configured. Please set GOOGLE_GENAI_API_KEY in your environment.');
      }
      this.ai = new GoogleGenAI({ apiKey: env.googleGenAiApiKey });
    }
    return this.ai;
  }

  async generateText(prompt: string, timeoutMs = 45000, maxRetries = 2): Promise<string> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const client = this.getClient();
        const model = env.geminiModel || 'gemini-3.8-flash';
        console.log(`Calling Gemini API with model: ${model}`);

        const generatePromise = client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini API request timed out after ${timeoutMs / 1000}s`)), timeoutMs);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        return response.text || '{}';
      } catch (error: any) {
        lastError = error;
        const msg = error.message || '';
        const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('429');

        if (isTransient && attempt < maxRetries) {
          const delay = (attempt + 1) * 1500;
          console.warn(`Gemini transient failure (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error('Error calling Gemini API:', msg);

        if (msg.includes('API key not valid') || msg.includes('auth') || msg.includes('403')) {
          throw new Error('Gemini API key is invalid or misconfigured.', { cause: error });
        }
        if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
          throw new Error(`The configured Gemini model (${env.geminiModel}) is unavailable or not supported.`, { cause: error });
        }
        if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
          throw new Error('The Gemini model is temporarily experiencing high demand. Please try again in a few moments.', { cause: error });
        }
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('Gemini API quota exceeded. Please wait a moment and try again.', { cause: error });
        }
        if (msg.includes('timed out')) {
          throw new Error('Gemini API request timed out. Please try again or provide shorter text.', { cause: error });
        }
        throw new Error(`Failed to generate content from Gemini API: ${msg}`, { cause: error });
      }
    }

    throw lastError;
  }
}

export const geminiService = new GeminiService();
