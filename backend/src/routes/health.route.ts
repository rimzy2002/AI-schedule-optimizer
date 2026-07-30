import { Router, type Request, type Response } from "express";
import { HealthCheckResponseSchema } from "@ai-schedule-optimizer/shared-types";

export const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  const payload = HealthCheckResponseSchema.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ai-schedule-optimizer-backend",
  });

  res.status(200).json(payload);
});
