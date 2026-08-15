import { prisma } from '@ai-schedule-optimizer/database';
import { backwardSchedule, ScheduledBlock } from '../../algorithms/scheduling/backwardScheduler';
import { SchedulableTask } from '../../algorithms/scheduling/calculatePriority';
import { availabilityService } from './availability.service';
import { studyBlockService } from './study-block.service';

export class SchedulerService {
  
  /**
   * Generates a schedule and saves it to the database.
   */
  async generateAndSaveSchedule(userId: string, courseId: string) {
    const tasks = await prisma.task.findMany({
      where: { 
        course_id: courseId,
        course: { user_id: userId }
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

    // Create a new Schedule record
    const schedule = await prisma.schedule.create({
      data: {
        user_id: userId,
        course_id: courseId,
        status: 'active',
      }
    });

    // Save StudyBlocks to the database
    if (scheduled.length > 0) {
      await prisma.studyBlock.createMany({
        data: scheduled.map(block => ({
          user_id: userId,
          schedule_id: schedule.id,
          course_id: courseId,
          task_id: block.taskId,
          title: `Study: ${block.taskTitle}`,
          start_time: block.start,
          end_time: block.end,
          status: 'pending',
        }))
      });
    }

    return {
      id: schedule.id,
      metrics: {
        totalBlocks: scheduled.length,
        deadlinesCovered: [...new Set(scheduled.map(s => s.taskId))].length,
        unallocatedTasks: unallocated.length
      }
    };
  }
}

export const schedulerService = new SchedulerService();
