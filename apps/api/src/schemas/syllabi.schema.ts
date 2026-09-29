import { z } from 'zod';

export const extractSyllabusSchema = z.object({
  rawText: z.string().trim().min(1, 'Syllabus text cannot be empty'),
});
