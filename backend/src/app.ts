import express, { type Express } from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { healthRouter } from "@/routes/health.route.js";
import { eventsRouter } from "@/routes/events.route.js";
import { errorHandler } from "@/middleware/errorHandler.js";

/**
 * Builds and returns a configured Express app WITHOUT calling .listen().
 * This is what makes the app testable via supertest — you import `app`
 * directly in tests and never bind a real port.
 *
 * Do not add app.listen() here. That belongs exclusively in server.ts.
 */
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api/events", eventsRouter);

  // 404 handler — must come after all registered routes
  app.use((_req, res) => {
    res.status(404).json({ error: "NotFound" });
  });

  // Error handler — must be registered LAST (Express identifies it by 4-arg arity)
  app.use(errorHandler);

  return app;
}
