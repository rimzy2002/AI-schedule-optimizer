import { z } from "zod";

export const CalendarEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  eventType: z.enum(["class", "exam", "study_block", "personal"]),
  title: z.string().min(1).max(255),
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  status: z.enum(["pending", "done", "missed", "cancelled"]),
  sourceTaskId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CreateEventSchema = z
  .object({
    eventType: z.enum(["class", "exam", "study_block", "personal"]),
    title: z.string().min(1).max(255),
    startUtc: z.string().datetime(),
    endUtc: z.string().datetime(),
    sourceTaskId: z.string().uuid().optional(),
  })
  .refine((data) => new Date(data.endUtc) > new Date(data.startUtc), {
    message: "endUtc must be strictly after startUtc",
    path: ["endUtc"],
  });

export type CreateEvent = z.infer<typeof CreateEventSchema>;

// No refine here — partial payloads can't be validated for time-order
// in isolation. Validation happens in the service layer against the
// MERGED row. This is documented so nobody "fixes" this later by adding
// a refine that only sees the partial patch and gives false confidence.
export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  startUtc: z.string().datetime().optional(),
  endUtc: z.string().datetime().optional(),
  status: z.enum(["pending", "done", "missed", "cancelled"]).optional(),
});

export type UpdateEvent = z.infer<typeof UpdateEventSchema>;

export const GetEventsQuerySchema = z
  .object({
    startUtc: z.string().datetime().optional(),
    endUtc: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine(
    (data) => !(Boolean(data.startUtc) !== Boolean(data.endUtc)),
    { message: "Both startUtc and endUtc must be provided together", path: ["endUtc"] }
  )
  .refine(
    (data) => !data.startUtc || !data.endUtc || new Date(data.endUtc) > new Date(data.startUtc),
    { message: "endUtc must be strictly after startUtc", path: ["endUtc"] }
  );

export type GetEventsQuery = z.infer<typeof GetEventsQuerySchema>;
