import { geminiService } from './gemini.service';
import { promptBuilderService } from './prompt-builder.service';
import { syllabusSchema, Syllabus } from '../../schemas/syllabus.schema';

export class SyllabusParserService {
  async parse(rawText: string): Promise<Syllabus> {
    const prompt = promptBuilderService.buildSyllabusPrompt(rawText);
    
    const rawJsonString = await geminiService.generateText(prompt);
    
    // Clean up potential markdown fences if the LLM ignored instructions
    let jsonToParse = rawJsonString.trim();
    if (jsonToParse.startsWith('```json')) {
      jsonToParse = jsonToParse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonToParse.startsWith('```')) {
      jsonToParse = jsonToParse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const parsedObject = JSON.parse(jsonToParse);
      
      // Zod validation (will throw if invalid)
      const validatedSyllabus = syllabusSchema.parse(parsedObject);
      return validatedSyllabus;
    } catch (error: any) {
      console.error('Failed to parse or validate Gemini response:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
}

export const syllabusParserService = new SyllabusParserService();
