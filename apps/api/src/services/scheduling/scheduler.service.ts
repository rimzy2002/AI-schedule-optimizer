import { prisma } from '@ai-schedule-optimizer/database';
import { backwardSchedule } from '../../algorithms/scheduling/backwardScheduler';
import { SchedulableTask } from '../../algorithms/scheduling/calculatePriority';
import { resolveTaskDeadline } from '../../algorithms/scheduling/timezone';
import { availabilityService } from './availability.service';
import { settingsService } from '../settings.service';

/**
 * SCHEDULING CONCURRENCY GUARANTEE & LIMITATIONS:
 * 
 * 1. Single-Process Guarantee (Current Local MVP):
 *    UserLockManager serializes competing schedule generation requests for the same user
 *    within a single Node.js process using an in-memory Promise-chain mutex.
 *    This ensures that simultaneous requests (even for different courses belonging to the same user)
 *    execute sequentially, preventing race conditions that would otherwise cause overlapping study blocks
 *    or duplicate active schedules.
 * 
 * 2. Multi-Process / Multi-Instance Limitation:
 *    Because UserLockManager is strictly an in-memory lock within one Node process, it does NOT coordinate
 *    or protect across multiple server instances, clustered worker processes, or serverless functions.
 *    If horizontal scaling across multiple Node.js processes or servers is deployed, distributed coordination
 *    (such as Redis-backed distributed locks / Redlock, or MySQL advisory locks via `SELECT GET_LOCK(...)`)
 *    must be implemented to serialize requests across processes.
 */
class UserLockManager {
  private userLocks = new Map<string, Promise<any>>();

  /**
   * Serializes operations per user to prevent concurrent schedule generations
   * within this process from producing overlapping schedules across courses.
   */
  async runExclusive<T>(userId: string, task: () => Promise<T>): Promise<T> {
    const prev = this.userLocks.get(userId) || Promise.resolve();
    let release: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    const next = prev.then(() => current).catch(() => current);
    this.userLocks.set(userId, next);

    await prev;
    try {
      return await task();
    } finally {
      release!();
      if (this.userLocks.get(userId) === next) {
        this.userLocks.delete(userId);
      }
    }
  }
}

export const schedulerLockManager = new UserLockManager();

export class SchedulerService {
  /**
   * Generates a schedule and saves it to the database atomically and concurrency-safely.
   */
  async generateAndSaveSchedule(
    userId: string, 
    courseId: string, 
    timeZone?: string,
    searchStartTime?: Date
  ) {
    return schedulerLockManager.runExclusive(userId, async () => {
      // Load user preferences for study hours and default timezone
      const userPrefs = await settingsService.getPreferences(userId);
      const effectiveTimezone = (timeZone && timeZone !== 'Asia/Colombo') ? timeZone : userPrefs.timezone;
      const dailySchedule = { startHour: userPrefs.startHour, endHour: userPrefs.endHour };
      // 1. Fetch only reviewed, eligible tasks for this course
      const tasks = await prisma.task.findMany({
        where: { 
          course_id: courseId,
          course: { user_id: userId },
          needs_review: false,
          status: { not: 'completed' },
        },
        include: {
          studyBlocks: {
            where: { status: 'completed' },
            select: { start_time: true, end_time: true }
          }
        }
      });

      if (tasks.length === 0) {
        throw new Error('No reviewed, eligible tasks found for this course. Please review and confirm tasks before scheduling.');
      }

      // 2. Build schedulable tasks, taking into account already completed work
      const schedulableTasks: SchedulableTask[] = [];

      for (const t of tasks) {
        let totalRequiredMinutes = 60;
        if (t.estimated_duration && t.estimated_duration > 0) {
          totalRequiredMinutes = t.estimated_duration;
        } else if (t.weight !== null && t.weight !== undefined) {
          totalRequiredMinutes = t.weight > 0 ? Math.min(Math.max(Math.round(t.weight * 15), 30), 300) : 30;
        }

        // Account for previously completed study blocks
        const completedMinutes = t.studyBlocks.reduce((sum, b) => {
          return sum + Math.max(0, Math.floor((b.end_time.getTime() - b.start_time.getTime()) / 60000));
        }, 0);

        const remainingStudyMinutes = Math.max(0, totalRequiredMinutes - completedMinutes);

        // Resolve deadline using documented local-time policy
        // If explicit timestamp (is_date_only === false), deadline is preserved exactly!
        // If date-only (is_date_only === true), resolves to study-day closing time (userPrefs.endHour:00) on that calendar date in effectiveTimezone converted to UTC.
        const resolvedDeadline = resolveTaskDeadline(t.deadline, t.is_date_only, effectiveTimezone, userPrefs.endHour);

        schedulableTasks.push({
          id: t.id,
          title: t.title,
          deadline: resolvedDeadline,
          weight: t.weight,
          requiredStudyMinutes: remainingStudyMinutes,
        });
      }

      // 3. Find the search bounds
      const searchStart = searchStartTime || new Date();
      let latestDeadline = new Date(searchStart);
      schedulableTasks.forEach(t => {
        if (t.deadline && t.deadline > latestDeadline) {
          latestDeadline = t.deadline;
        }
      });

      const searchEnd = new Date(Math.max(latestDeadline.getTime(), searchStart.getTime() + 7 * 24 * 60 * 60 * 1000));

      // 4. Preserve study blocks linked to ACTIVE or PAUSED focus sessions
      const activeSessions = await prisma.focusSession.findMany({
        where: {
          user_id: userId,
          status: { in: ['ACTIVE', 'PAUSED'] },
          study_block_id: { not: null }
        },
        select: { study_block_id: true }
      });
      const lockedBlockIds = activeSessions.map(s => s.study_block_id).filter(Boolean) as string[];

      // 5. Fetch busy intervals (excluding only unlocked pending blocks for this course)
      const busyIntervals = await availabilityService.getBusyIntervals(
        userId,
        searchStart,
        searchEnd,
        courseId,
        lockedBlockIds
      );

      const maxSessionDuration = userPrefs.maxSessionDuration || 90;

      // 6. Run the backward scheduling algorithm
      const { scheduled, unallocated } = backwardSchedule(
        schedulableTasks,
        busyIntervals,
        searchStart,
        dailySchedule,
        effectiveTimezone,
        maxSessionDuration
      );

      // 7. Atomic schedule replacement: everything succeeds or everything rolls back
      const createdSchedule = await prisma.$transaction(async (tx) => {
        // Archive existing active schedules for this course
        await tx.schedule.updateMany({
          where: {
            user_id: userId,
            course_id: courseId,
            status: 'active'
          },
          data: {
            status: 'archived'
          }
        });

        // Delete pending study blocks for this course, EXCEPT those locked by active/paused sessions
        await tx.studyBlock.deleteMany({
          where: {
            user_id: userId,
            course_id: courseId,
            status: 'pending',
            ...(lockedBlockIds.length > 0 ? {
              id: { notIn: lockedBlockIds }
            } : {})
          }
        });

        // Create the new Schedule record
        const newSchedule = await tx.schedule.create({
          data: {
            user_id: userId,
            course_id: courseId,
            status: 'active',
          }
        });

        // Save new StudyBlocks
        if (scheduled.length > 0) {
          await tx.studyBlock.createMany({
            data: scheduled.map(block => ({
              user_id: userId,
              schedule_id: newSchedule.id,
              course_id: courseId,
              task_id: block.taskId,
              title: `Study: ${block.taskTitle}`,
              start_time: block.start,
              end_time: block.end,
              status: 'pending',
            }))
          });
        }

        return newSchedule;
      });

      const unallocatedDetails = unallocated.map(u => {
        const t = tasks.find(task => task.id === u.taskId);
        const isPast = t?.deadline && t.deadline < searchStart;
        return {
          taskId: u.taskId,
          taskTitle: t?.title || 'Unknown Task',
          unallocatedMinutes: u.unallocatedMinutes,
          reason: isPast
            ? 'Task deadline is in the past'
            : 'Insufficient available study capacity before deadline'
        };
      });

      return {
        id: createdSchedule.id,
        metrics: {
          totalBlocks: scheduled.length,
          deadlinesCovered: [...new Set(scheduled.map(s => s.taskId))].length,
          unallocatedTasks: unallocated.length,
          unallocatedDetails
        }
      };
    });
  }
}

export const schedulerService = new SchedulerService();
