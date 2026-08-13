import { SchedulableTask, calculatePriority } from './calculatePriority';
import { TimeInterval } from './detectOverlap';
import { findAvailableSlots, DailySchedule } from './findAvailableSlots';
import { splitStudyTime } from './splitStudyTime';

export interface ScheduledBlock {
  taskId: string;
  taskTitle: string;
  start: Date;
  end: Date;
}

export function backwardSchedule(
  tasks: SchedulableTask[],
  busyIntervals: TimeInterval[],
  scheduleStart: Date,
  dailySchedule: DailySchedule = { startHour: 8, endHour: 22 }
): { scheduled: ScheduledBlock[], unallocated: { taskId: string, unallocatedMinutes: number }[] } {
  
  const scheduled: ScheduledBlock[] = [];
  const unallocated: { taskId: string, unallocatedMinutes: number }[] = [];
  
  // Clone busy intervals since we will add to them as we schedule blocks
  let currentBusy = [...busyIntervals];

  // 1. Prioritize tasks
  const prioritized = calculatePriority(tasks);

  for (const task of prioritized) {
    if (task.requiredStudyMinutes <= 0) continue;

    // Split task into blocks
    const blocks = splitStudyTime(task.requiredStudyMinutes);
    let taskUnallocated = 0;

    // Use deadline as the search end. If no deadline, use some arbitrary max future date, e.g. 30 days.
    const searchEnd = task.deadline ? new Date(task.deadline) : new Date(scheduleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // We process blocks from last to first to place them as close to the deadline as possible
    // Wait, it's better to just place blocks backward from the deadline.
    for (const block of blocks) {
      // Re-calculate available slots because currentBusy has been updated
      const available = findAvailableSlots(scheduleStart, searchEnd, currentBusy, dailySchedule);
      
      // We want to schedule backward, so look at the latest available slots first
      let scheduledBlock = false;
      
      for (let i = available.length - 1; i >= 0; i--) {
        const slot = available[i];
        const slotDurationMins = (slot.end.getTime() - slot.start.getTime()) / 60000;

        if (slotDurationMins >= block.durationMinutes) {
          // Place the block at the END of the slot (backward scheduling)
          const blockEnd = new Date(slot.end);
          const blockStart = new Date(blockEnd.getTime() - block.durationMinutes * 60000);

          scheduled.push({
            taskId: task.id,
            taskTitle: task.title,
            start: blockStart,
            end: blockEnd,
          });

          // Add to busy intervals so it's not reused
          currentBusy.push({ start: blockStart, end: blockEnd });
          scheduledBlock = true;
          break;
        }
      }

      if (!scheduledBlock) {
        taskUnallocated += block.durationMinutes;
      }
    }

    if (taskUnallocated > 0) {
      unallocated.push({ taskId: task.id, unallocatedMinutes: taskUnallocated });
    }
  }

  // Sort final schedule chronologically
  scheduled.sort((a, b) => a.start.getTime() - b.start.getTime());

  return { scheduled, unallocated };
}
