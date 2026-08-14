import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: env.googleGenAiApiKey || 'placeholder_api_key' });

export class GeminiService {
  async generateText(prompt: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });
      
      return response.text || '{}';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to generate content from Gemini API');
    }
  }
}

export const geminiService = new GeminiService();
