import { Router } from "express";
import { eventsController } from "@/controllers/events.controller.js";
import { requireAuth } from "@/middleware/auth.js";
import { asyncHandler } from "@/middleware/asyncHandler.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

eventsRouter.get("/", asyncHandler(eventsController.list));
eventsRouter.post("/", asyncHandler(eventsController.create));
eventsRouter.patch("/:id", asyncHandler(eventsController.update));
eventsRouter.delete("/:id", asyncHandler(eventsController.remove));
