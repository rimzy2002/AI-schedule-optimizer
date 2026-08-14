import { prisma } from '@ai-schedule-optimizer/database';
import { TimeInterval } from '../../algorithms/scheduling/detectOverlap';

export class AvailabilityService {
  /**
   * Fetches all busy intervals for a given user within a date range.
   * This includes CalendarEvents and existing StudyBlocks.
   */
  async getBusyIntervals(userId: string, start: Date, end: Date): Promise<TimeInterval[]> {
    const events = await prisma.calendarEvent.findMany({
      where: {
        user_id: userId,
        start_time: { lte: end },
        end_time: { gte: start },
      },
    });

    const existingBlocks = await prisma.studyBlock.findMany({
      where: {
        user_id: userId,
        start_time: { lte: end },
        end_time: { gte: start },
      },
    });

    const busy: TimeInterval[] = [];
    
    events.forEach(e => busy.push({ start: e.start_time, end: e.end_time }));
    existingBlocks.forEach(b => busy.push({ start: b.start_time, end: b.end_time }));

    return busy;
  }
}

export const availabilityService = new AvailabilityService();
