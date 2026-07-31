import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "@/app.js";
import { pool } from "@/db/connection.js";
import { randomUUID } from "node:crypto";

const app = createApp();

describe("Calendar Events CRUD", () => {
  const userA = randomUUID();
  const userB = randomUUID();

  beforeAll(async () => {
    // Insert test users directly bypassing any missing user service for now.
    // The DB schema needs users to exist for the FK to pass.
    await pool.query(
      `INSERT INTO Users (id, email, password_hash) VALUES 
      (?, 'usera@test.com', 'hash'), 
      (?, 'userb@test.com', 'hash')`,
      [userA, userB]
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM Users WHERE id IN (?, ?)`, [userA, userB]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clear events before each test
    await pool.query(`DELETE FROM Calendar_Events`);
  });

  describe("Authentication Guard", () => {
    it("returns 401 if x-user-id is missing", async () => {
      const res = await request(app).get("/api/events");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Missing x-user-id header");
    });

    it("returns 401 if x-user-id is malformed", async () => {
      const res = await request(app).get("/api/events").set("x-user-id", "not-a-uuid");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid x-user-id format");
    });
  });

  describe("POST /api/events", () => {
    it("successfully creates a valid event", async () => {
      const payload = {
        eventType: "study_block",
        title: "Test Event",
        startUtc: new Date("2030-01-01T10:00:00Z").toISOString(),
        endUtc: new Date("2030-01-01T11:00:00Z").toISOString(),
      };

      const res = await request(app)
        .post("/api/events")
        .set("x-user-id", userA)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.userId).toBe(userA);
      expect(res.body.data.status).toBe("pending");
    });

    it("rejects backwards time range with 422", async () => {
      const payload = {
        eventType: "class",
        title: "Backwards Event",
        startUtc: new Date("2030-01-01T11:00:00Z").toISOString(),
        endUtc: new Date("2030-01-01T10:00:00Z").toISOString(),
      };

      const res = await request(app)
        .post("/api/events")
        .set("x-user-id", userA)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("ValidationError");
    });
  });

  describe("PATCH /api/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/events")
        .set("x-user-id", userA)
        .send({
          eventType: "personal",
          title: "My Event",
          startUtc: new Date("2030-01-01T10:00:00Z").toISOString(),
          endUtc: new Date("2030-01-01T11:00:00Z").toISOString(),
        });
      eventId = res.body.data.id;
    });

    it("returns 404 when User B tries to update User A's event", async () => {
      const res = await request(app)
        .patch(`/api/events/${eventId}`)
        .set("x-user-id", userB)
        .send({ title: "Hacked Title" });

      expect(res.status).toBe(404);
    });

    it("successfully updates event title", async () => {
      const res = await request(app)
        .patch(`/api/events/${eventId}`)
        .set("x-user-id", userA)
        .send({ title: "New Title" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("New Title");
    });

    it("rejects PATCH that creates backwards time range via merge-validation", async () => {
      const res = await request(app)
        .patch(`/api/events/${eventId}`)
        .set("x-user-id", userA)
        .send({ endUtc: new Date("2030-01-01T09:00:00Z").toISOString() });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe("endUtc must be strictly after startUtc");
    });
    
    it("allows empty PATCH object (verifies short-circuit regression guard)", async () => {
      const res = await request(app)
        .patch(`/api/events/${eventId}`)
        .set("x-user-id", userA)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("My Event");
    });
  });

  describe("DELETE /api/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/events")
        .set("x-user-id", userA)
        .send({
          eventType: "personal",
          title: "My Event to delete",
          startUtc: new Date("2030-01-01T10:00:00Z").toISOString(),
          endUtc: new Date("2030-01-01T11:00:00Z").toISOString(),
        });
      eventId = res.body.data.id;
    });

    it("returns 404 when User B tries to delete User A's event", async () => {
      const res = await request(app)
        .delete(`/api/events/${eventId}`)
        .set("x-user-id", userB);

      expect(res.status).toBe(404);
    });

    it("successfully deletes the event for the owner", async () => {
      const res = await request(app)
        .delete(`/api/events/${eventId}`)
        .set("x-user-id", userA);

      expect(res.status).toBe(204);

      // Verify it's actually gone
      const getRes = await request(app)
        .get("/api/events")
        .set("x-user-id", userA);
      expect(getRes.body.data).toHaveLength(0);
    });
  });

  describe("GET /api/events", () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/events")
          .set("x-user-id", userA)
          .send({
            eventType: "study_block",
            title: `Event ${i}`,
            startUtc: new Date(`2030-01-0${i + 1}T10:00:00Z`).toISOString(),
            endUtc: new Date(`2030-01-0${i + 1}T11:00:00Z`).toISOString(),
          });
      }
    });

    it("rejects query with one-sided date bounds", async () => {
      const res = await request(app)
        .get("/api/events?startUtc=2030-01-01T00:00:00Z")
        .set("x-user-id", userA);

      expect(res.status).toBe(422);
    });

    it("rejects backwards date bounds in query", async () => {
      const res = await request(app)
        .get("/api/events?startUtc=2030-01-05T00:00:00Z&endUtc=2030-01-01T00:00:00Z")
        .set("x-user-id", userA);

      expect(res.status).toBe(422);
    });

    it("successfully fetches events within date bounds", async () => {
      const res = await request(app)
        .get("/api/events?startUtc=2030-01-02T00:00:00Z&endUtc=2030-01-03T23:59:59Z")
        .set("x-user-id", userA);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
    
    it("respects the limit parameter", async () => {
      const res = await request(app)
        .get("/api/events?limit=2")
        .set("x-user-id", userA);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
    
    it("rejects limit > 100", async () => {
      const res = await request(app)
        .get("/api/events?limit=101")
        .set("x-user-id", userA);
      
      expect(res.status).toBe(422);
    });
  });
});
