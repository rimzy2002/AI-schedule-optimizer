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

  console.error(err);
  res.status(500).json({ error: "InternalServerError" });
}
