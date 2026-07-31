import { env } from "@/config/env.js";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

if (env.NODE_ENV === "production") {
  throw new Error(
    "FATAL: mock x-user-id auth is active. Real authentication must be " +
    "wired in before this module can load in production."
  );
}

const UuidSchema = z.string().uuid();

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userIdHeader = req.header("x-user-id");

  if (!userIdHeader) {
    res.status(401).json({ error: "Unauthorized", message: "Missing x-user-id header" });
    return;
  }

  const parsed = UuidSchema.safeParse(userIdHeader);
  if (!parsed.success) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid x-user-id format" });
    return;
  }

  req.userId = parsed.data;
  next();
}
