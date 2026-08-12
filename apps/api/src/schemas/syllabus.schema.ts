import { z } from 'zod';

export const syllabusTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  type: z.enum(['assignment', 'exam', 'quiz', 'project', 'reading', 'other']),
  weight: z.number().min(0).max(100, 'Weight must be a percentage between 0 and 100'),
  deadline: z.string().datetime({ message: 'Deadline must be a valid ISO 8601 date string' }).nullable(),
});

export const syllabusSchema = z.object({
  course: z.string().min(1, 'Course name is required'),
  tasks: z.array(syllabusTaskSchema),
});

export type SyllabusTask = z.infer<typeof syllabusTaskSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;
