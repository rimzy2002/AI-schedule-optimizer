import { prisma } from '@ai-schedule-optimizer/database';
import { TimeInterval } from '../../algorithms/scheduling/detectOverlap';

export class AvailabilityService {
  /**
   * Fetches all busy intervals for a given user within a date range.
   * This includes CalendarEvents, completed StudyBlocks, and active StudyBlocks.
   * If excludePendingCourseId is provided, un-locked pending blocks of that course
   * are excluded so they can be rescheduled without self-collision.
   */
  async getBusyIntervals(
    userId: string, 
    start: Date, 
    end: Date, 
    excludePendingCourseId?: string,
    lockedBlockIds?: string[]
  ): Promise<TimeInterval[]> {
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
        NOT: excludePendingCourseId ? {
          course_id: excludePendingCourseId,
          status: 'pending',
          ...(lockedBlockIds && lockedBlockIds.length > 0 ? {
            id: { notIn: lockedBlockIds }
          } : {})
        } : undefined,
      },
    });

    const busy: TimeInterval[] = [];
    
    events.forEach(e => busy.push({ start: e.start_time, end: e.end_time }));
    existingBlocks.forEach(b => busy.push({ start: b.start_time, end: b.end_time }));

    return busy;
  }
}

export const availabilityService = new AvailabilityService();
