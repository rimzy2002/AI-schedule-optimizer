import { z } from 'zod';

export const startFocusSessionSchema = z.object({
  studyBlockId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  plannedMinutes: z.number().int().positive().default(25),
}).refine(data => data.studyBlockId || data.taskId, {
  message: "Either studyBlockId or taskId must be provided",
});
