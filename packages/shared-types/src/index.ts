import { z } from "zod";

/**
 * Day 1 stub. This file is the SINGLE SOURCE OF TRUTH for data shapes
 * shared between backend validation and frontend rendering.
 *
 * DO NOT redefine these interfaces separately in backend/ or frontend/.
 * Import from here. If backend and frontend drift, that's a signal
 * this file wasn't updated first.
 *
 * Full CalendarEvent / AITask schemas land on Day 3 (CRUD) and Day 6
 * (LLM parsing) respectively — see 15-day sprint plan.
 */

export const HealthCheckResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
  service: z.literal("ai-schedule-optimizer-backend"),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
