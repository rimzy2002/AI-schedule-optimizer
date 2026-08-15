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

    // Add synthetic night blocks from 22:00 to 08:00 each day
    let currentDay = new Date(start);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay <= end) {
      // 10 PM today
      const nightStart = new Date(currentDay);
      nightStart.setHours(22, 0, 0, 0);

      // 8 AM tomorrow
      const nightEnd = new Date(currentDay);
      nightEnd.setDate(nightEnd.getDate() + 1);
      nightEnd.setHours(8, 0, 0, 0);

      busy.push({ start: nightStart, end: nightEnd });

      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return busy;
  }
}

export const availabilityService = new AvailabilityService();
