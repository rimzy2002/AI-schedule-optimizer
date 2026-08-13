import { z } from 'zod';
import { syllabusTaskSchema } from './syllabus.schema';

export const confirmTasksSchema = z.object({
  syllabusId: z.string().uuid('Invalid syllabus ID'),
  tasks: z.array(syllabusTaskSchema).min(1, 'At least one task is required'),
});

export type ConfirmTasksRequest = z.infer<typeof confirmTasksSchema>;
