import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "@/app.js";

describe("GET /api/health", () => {
  const app = createApp();

  it("returns 200 with a valid, schema-conforming payload", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("ai-schedule-optimizer-backend");
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });

  it("returns 404 for an unknown route", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
