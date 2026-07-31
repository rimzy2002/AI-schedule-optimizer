import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/**
 * Centralized error handler. Must be registered LAST in app.ts,
 * after all routes — Express identifies error middleware by arity (4 args).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "ValidationError",
      details: err.flatten(),
    });
    return;
  }

  if (err && typeof err === "object" && "name" in err) {
    if (err.name === "NotFoundError") {
      res.status(404).json({ error: "NotFound", message: (err as Error).message });
      return;
    }
    if (err.name === "ValidationError") {
      res.status(422).json({ error: "ValidationError", message: (err as Error).message });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "InternalServerError" });
}
