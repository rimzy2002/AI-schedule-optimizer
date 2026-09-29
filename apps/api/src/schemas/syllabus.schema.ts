import { z } from 'zod';
import { validateDeadline } from '../algorithms/scheduling/dateValidation';

export const syllabusTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  type: z.enum(['assignment', 'exam', 'quiz', 'project', 'presentation', 'reading', 'discussion', 'other']),
  weight: z.number().min(0).max(100, 'Weight must be a percentage between 0 and 100'),
  deadline: z.string().nullable(),
  isDateOnly: z.boolean().optional(),
  estimatedDuration: z.number().min(0).nullable().optional(),
  description: z.string().nullable().optional(),
  recurring: z.boolean().default(false),
}).superRefine((task, ctx) => {
  if (task.deadline !== null && task.deadline !== undefined) {
    const res = validateDeadline(task.deadline, task.isDateOnly);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || 'Deadline must be a valid calendar date or ISO 8601 string',
        path: ['deadline'],
      });
    }
  }
});

export const syllabusSchema = z.object({
  course: z.string().min(1, 'Course name is required'),
  courseCode: z.string().nullable().optional(),
  instructor: z.string().nullable().optional(),
  semester: z.string().nullable().optional(),
  tasks: z.array(syllabusTaskSchema),
});

export type SyllabusTask = z.infer<typeof syllabusTaskSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;
