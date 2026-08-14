import { prisma } from '@ai-schedule-optimizer/database/src/client';
import { backwardSchedule, ScheduledBlock } from '../../algorithms/scheduling/backwardScheduler';
import { SchedulableTask } from '../../algorithms/scheduling/calculatePriority';
import { availabilityService } from './availability.service';
import { studyBlockService } from './study-block.service';

export class SchedulerService {
  
  /**
   * Generates a schedule preview without saving to the database.
   */
  async generatePreview(userId: string, syllabusId: string) {
    const tasks = await prisma.task.findMany({
      where: { 
        syllabus_id: syllabusId,
        syllabus: { user_id: userId }
      }
    });

    if (tasks.length === 0) {
      throw new Error('No tasks found or access denied');
    }

    const schedulableTasks: SchedulableTask[] = tasks.map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      weight: t.weight,
      // If weight is null, default to 60 mins. Otherwise, say 1% = 15 mins. Max 300 mins.
      requiredStudyMinutes: t.weight ? Math.min(Math.max(t.weight * 15, 30), 300) : 60,
    }));

    // Find the latest deadline to determine the search window
    let latestDeadline = new Date();
    tasks.forEach(t => {
      if (t.deadline && t.deadline > latestDeadline) {
        latestDeadline = t.deadline;
      }
    });

    // Fetch availability up to the latest deadline (plus a little buffer, e.g. 7 days if no deadlines exist)
    const searchStart = new Date();
    const searchEnd = new Date(Math.max(latestDeadline.getTime(), searchStart.getTime() + 7 * 24 * 60 * 60 * 1000));
    
    const busyIntervals = await availabilityService.getBusyIntervals(userId, searchStart, searchEnd);

    const { scheduled, unallocated } = backwardSchedule(
      schedulableTasks,
      busyIntervals,
      searchStart
    );

    return {
      scheduled,
      unallocated,
      metrics: {
        totalBlocks: scheduled.length,
        deadlinesCovered: [...new Set(scheduled.map(s => s.taskId))].length,
      }
    };
  }

  /**
   * Accepts a schedule and saves it to the database.
   */
  async acceptSchedule(userId: string, blocks: ScheduledBlock[]) {
    const count = await studyBlockService.saveBlocks(userId, blocks);
    return count;
  }
}

export const schedulerService = new SchedulerService();
