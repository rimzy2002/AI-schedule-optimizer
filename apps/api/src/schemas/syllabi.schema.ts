import { z } from 'zod';

export const extractSyllabusSchema = z.object({
  rawText: z.string().min(1, 'Syllabus text cannot be empty'),
});
