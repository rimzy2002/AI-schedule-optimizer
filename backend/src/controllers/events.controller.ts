import type { Request, Response } from "express";
import { CreateEventSchema, GetEventsQuerySchema, UpdateEventSchema } from "@ai-schedule-optimizer/shared-types";
import { eventsService } from "@/services/events.service.js";
import { z } from "zod";

const IdParamSchema = z.object({
  id: z.string().uuid(),
});

export const eventsController = {
  async list(req: Request, res: Response) {
    const query = GetEventsQuerySchema.parse(req.query);
    const events = await eventsService.getEvents(req.userId, query);
    res.json({ data: events });
  },

  async create(req: Request, res: Response) {
    const body = CreateEventSchema.parse(req.body);
    const event = await eventsService.createEvent(req.userId, body);
    res.status(201).json({ data: event });
  },

  async update(req: Request, res: Response) {
    const { id } = IdParamSchema.parse(req.params);
    const body = UpdateEventSchema.parse(req.body);
    const event = await eventsService.updateEvent(req.userId, id, body);
    res.json({ data: event });
  },

  async remove(req: Request, res: Response) {
    const { id } = IdParamSchema.parse(req.params);
    await eventsService.deleteEvent(req.userId, id);
    res.status(204).send();
  },
};
