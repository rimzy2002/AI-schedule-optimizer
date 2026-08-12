import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syllabusParserService } from '../../src/services/ai/syllabus-parser.service';
import { geminiService } from '../../src/services/ai/gemini.service';
import { syllabusSchema } from '../../src/schemas/syllabus.schema';
import { syllabusWorker } from '../../src/workers/syllabus.worker';
import { Job } from 'bullmq';

vi.mock('../../src/services/ai/gemini.service', () => ({
  geminiService: {
    generateText: vi.fn(),
  },
}));

describe('AI Syllabus Parsing and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully parse a valid syllabus', async () => {
    const validJson = JSON.stringify({
      course: 'Calculus I',
      tasks: [
        { name: 'Midterm', type: 'exam', weight: 30, deadline: '2026-10-15T12:00:00Z' },
        { name: 'Homework 1', type: 'assignment', weight: 10, deadline: null },
      ]
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(validJson);

    const result = await syllabusParserService.parse('some syllabus text');
    expect(result.course).toBe('Calculus I');
    expect(result.tasks).toHaveLength(2);
  });

  it('should throw error for empty syllabus text if API returns empty', async () => {
    vi.mocked(geminiService.generateText).mockResolvedValue('{}');
    
    await expect(syllabusParserService.parse('')).rejects.toThrow(/AI processing failed:/);
  });

  it('should parse successfully when Gemini returns markdown fences', async () => {
    const validJson = JSON.stringify({
      course: 'Calculus II',
      tasks: []
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(`\`\`\`json\n${validJson}\n\`\`\``);

    const result = await syllabusParserService.parse('some text');
    expect(result.course).toBe('Calculus II');
  });

  it('should throw error when Gemini returns invalid JSON', async () => {
    vi.mocked(geminiService.generateText).mockResolvedValue('This is not json');
    await expect(syllabusParserService.parse('some text')).rejects.toThrow(/AI processing failed:/);
  });

  it('should throw error when Gemini returns missing required property (course)', async () => {
    const invalidJson = JSON.stringify({
      tasks: []
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(invalidJson);
    await expect(syllabusParserService.parse('some text')).rejects.toThrow(/AI processing failed:/);
  });

  it('should throw error when Gemini returns wrong date format', async () => {
    const invalidDateJson = JSON.stringify({
      course: 'Physics',
      tasks: [
        { name: 'Test', type: 'exam', weight: 50, deadline: 'October 15th, 2026' }
      ]
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(invalidDateJson);
    await expect(syllabusParserService.parse('some text')).rejects.toThrow(/AI processing failed:/);
  });

  it('should throw error when Gemini returns string instead of number for weight', async () => {
    const invalidWeightJson = JSON.stringify({
      course: 'Physics',
      tasks: [
        { name: 'Test', type: 'exam', weight: '50%', deadline: null }
      ]
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(invalidWeightJson);
    await expect(syllabusParserService.parse('some text')).rejects.toThrow(/AI processing failed:/);
  });

  it('should handle Gemini API failure', async () => {
    vi.mocked(geminiService.generateText).mockRejectedValue(new Error('API quota exceeded'));
    await expect(syllabusParserService.parse('some text')).rejects.toThrow('API quota exceeded');
  });
});

describe('Syllabus Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete job successfully', async () => {
    const validJson = JSON.stringify({
      course: 'Chemistry',
      tasks: []
    });
    vi.mocked(geminiService.generateText).mockResolvedValue(validJson);

    const mockJob = {
      id: 'job-1',
      data: { rawText: 'syllabus text' }
    } as Job;

    // Simulate worker processing
    const result = await syllabusWorker.processFn(mockJob);
    expect(result).toBeDefined();
    expect(result.course).toBe('Chemistry');
  });

  it('should throw and fail job if worker fails', async () => {
    vi.mocked(geminiService.generateText).mockRejectedValue(new Error('API Error'));

    const mockJob = {
      id: 'job-2',
      data: { rawText: 'syllabus text' }
    } as Job;

    await expect(syllabusWorker.processFn(mockJob)).rejects.toThrow('API Error');
  });
});
