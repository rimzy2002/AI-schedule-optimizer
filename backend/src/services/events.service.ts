import { pool } from "@/db/connection.js";
import { NotFoundError, ValidationError } from "@/utils/errors.js";
import type { CalendarEvent, CreateEvent, GetEventsQuery, UpdateEvent } from "@ai-schedule-optimizer/shared-types";
import { randomUUID } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export class EventsService {
  async getEvents(userId: string, query: GetEventsQuery): Promise<CalendarEvent[]> {
    let sql = "SELECT * FROM Calendar_Events WHERE user_id = ?";
    const params: any[] = [userId];

    if (query.startUtc && query.endUtc) {
      sql += " AND start_utc >= ? AND end_utc <= ?";
      params.push(query.startUtc, query.endUtc);
    }

    sql += " ORDER BY start_utc ASC LIMIT ?";
    params.push(query.limit);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    
    // Map DB rows to CalendarEvent objects
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      title: row.title,
      startUtc: new Date(row.start_utc).toISOString(),
      endUtc: new Date(row.end_utc).toISOString(),
      status: row.status,
      sourceTaskId: row.source_task_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async createEvent(userId: string, payload: CreateEvent): Promise<CalendarEvent> {
    const id = randomUUID();
    const sql = `
      INSERT INTO Calendar_Events 
      (id, user_id, event_type, title, start_utc, end_utc, source_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      userId,
      payload.eventType,
      payload.title,
      payload.startUtc,
      payload.endUtc,
      payload.sourceTaskId || null,
    ];

    await pool.query(sql, params);

    // Fetch and return the created event to ensure defaults/formatting are correctly returned
    return this.getEventById(userId, id);
  }

  async updateEvent(userId: string, eventId: string, payload: UpdateEvent): Promise<CalendarEvent> {
    // 1. Fetch current row
    const currentRow = await this.getEventById(userId, eventId);

    // 2. Merge changes
    const mergedStartUtc = payload.startUtc || currentRow.startUtc;
    const mergedEndUtc = payload.endUtc || currentRow.endUtc;

    // 3. Unconditionally validate merged time ordering
    if (new Date(mergedEndUtc) <= new Date(mergedStartUtc)) {
      throw new ValidationError("endUtc must be strictly after startUtc");
    }

    // 4. Update
    const sql = `
      UPDATE Calendar_Events
      SET title = COALESCE(?, title),
          start_utc = COALESCE(?, start_utc),
          end_utc = COALESCE(?, end_utc),
          status = COALESCE(?, status)
      WHERE id = ? AND user_id = ?
    `;
    
    const params = [
      payload.title || null,
      payload.startUtc || null,
      payload.endUtc || null,
      payload.status || null,
      eventId,
      userId
    ];

    await pool.query(sql, params);

    return this.getEventById(userId, eventId);
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const sql = "DELETE FROM Calendar_Events WHERE id = ? AND user_id = ?";
    const [result] = await pool.query<ResultSetHeader>(sql, [eventId, userId]);
    
    if (result.affectedRows === 0) {
      throw new NotFoundError("Event not found or not owned by user");
    }
  }

  // Internal helper
  private async getEventById(userId: string, eventId: string): Promise<CalendarEvent> {
    const sql = "SELECT * FROM Calendar_Events WHERE id = ? AND user_id = ?";
    const [rows] = await pool.query<RowDataPacket[]>(sql, [eventId, userId]);
    
    if (rows.length === 0) {
      throw new NotFoundError("Event not found");
    }

    const row = rows[0]!;
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      title: row.title,
      startUtc: new Date(row.start_utc).toISOString(),
      endUtc: new Date(row.end_utc).toISOString(),
      status: row.status,
      sourceTaskId: row.source_task_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

export const eventsService = new EventsService();
