import { prisma } from '@ai-schedule-optimizer/database/src/client';
import { TimeInterval, detectOverlap } from '../../algorithms/scheduling/detectOverlap';
import { availabilityService } from './availability.service';

export class OverlapService {
  /**
   * Checks if a proposed block overlaps with any existing schedule for a user.
   */
  async checkOverlap(userId: string, proposed: TimeInterval): Promise<boolean> {
    const busy = await availabilityService.getBusyIntervals(userId, proposed.start, proposed.end);
    return detectOverlap(proposed, busy);
  }
}

export const overlapService = new OverlapService();
