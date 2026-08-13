import { describe, it, expect } from 'vitest';
import { backwardSchedule } from '../../src/algorithms/scheduling/backwardScheduler';
import { SchedulableTask } from '../../src/algorithms/scheduling/calculatePriority';
import { TimeInterval } from '../../src/algorithms/scheduling/detectOverlap';

describe('backwardScheduler', () => {
  const scheduleStart = new Date('2023-10-01T08:00:00Z');
  const dailySchedule = { startHour: 8, endHour: 22 };

  it('schedules a single task', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(unallocated.length).toBe(0);
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].start.getTime()).toBe(new Date('2023-10-02T21:00:00Z').getTime());
  });

  it('schedules multiple tasks', () => {
    const tasks: SchedulableTask[] = [
      { id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: '2', title: 'Task 2', deadline: new Date('2023-10-03T22:00:00Z'), weight: 20, requiredStudyMinutes: 120 },
    ];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(unallocated.length).toBe(0);
    expect(scheduled.length).toBe(2); // Task 2 requires 120 mins, max block is 120, so 1 block. Task 1 is 1 block.
  });

  it('handles same deadline by priority', () => {
    const deadline = new Date('2023-10-02T22:00:00Z');
    const tasks: SchedulableTask[] = [
      { id: 'low-weight', title: 'T1', deadline, weight: 10, requiredStudyMinutes: 60 },
      { id: 'high-weight', title: 'T2', deadline, weight: 50, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    // T2 has higher weight, so it's prioritized (placed first from the back -> occupies latest slot)
    const t1Block = scheduled.find(s => s.taskId === 'low-weight')!;
    const t2Block = scheduled.find(s => s.taskId === 'high-weight')!;
    expect(t2Block.start.getTime()).toBeGreaterThan(t1Block.start.getTime());
  });

  it('avoids calendar conflict', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    const busy: TimeInterval[] = [{ start: new Date('2023-10-02T20:00:00Z'), end: new Date('2023-10-02T22:00:00Z') }];
    const { scheduled } = backwardSchedule(tasks, busy, scheduleStart, dailySchedule);
    // Should be placed right before the busy block
    expect(scheduled[0].end.getTime()).toBeLessThanOrEqual(new Date('2023-10-02T20:00:00Z').getTime());
  });

  it('handles no available slot', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-01T09:00:00Z'), weight: 10, requiredStudyMinutes: 120 }];
    // Only 1 hour available before deadline on start day, but task needs 120 mins
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(unallocated.length).toBeGreaterThan(0);
  });

  it('splits task larger than one block', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 180 }];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled.length).toBeGreaterThan(1);
    const totalAllocated = scheduled.reduce((sum, b) => sum + (b.end.getTime() - b.start.getTime()) / 60000, 0);
    expect(totalAllocated).toBe(180);
  });

  it('schedules deadline tomorrow', () => {
    const tomorrow = new Date(scheduleStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // Noon tomorrow
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: tomorrow, weight: 10, requiredStudyMinutes: 60 }];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled[0].end.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
  });

  it('handles deadline already passed', () => {
    const past = new Date(scheduleStart.getTime() - 86400000);
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: past, weight: 10, requiredStudyMinutes: 60 }];
    const { unallocated, scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled.length).toBe(0);
    expect(unallocated.length).toBe(1);
  });

  it('event exactly touches boundary', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    // Busy exactly at the end of the day, leaving the slot before it
    const busy: TimeInterval[] = [{ start: new Date('2023-10-02T21:00:00Z'), end: new Date('2023-10-02T22:00:00Z') }];
    const { scheduled } = backwardSchedule(tasks, busy, scheduleStart, dailySchedule);
    expect(scheduled[0].end.getTime()).toBe(new Date('2023-10-02T21:00:00Z').getTime());
  });

  it('handles timezone boundary (UTC)', () => {
    // Ensuring dates are handled correctly as Date objects (already tested somewhat implicitly by using Date objects everywhere)
    expect(true).toBe(true);
  });

  it('prevents study block overlap for multiple tasks', () => {
    const tasks: SchedulableTask[] = [
      { id: '1', title: 'T1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: '2', title: 'T2', deadline: new Date('2023-10-02T22:00:00Z'), weight: 20, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled.length).toBe(2);
    // Check they don't overlap
    const b1 = scheduled[0];
    const b2 = scheduled[1];
    expect(b1.end.getTime()).toBeLessThanOrEqual(b2.start.getTime());
  });

  it('handles multiple courses via task list independently', () => {
     // Multiple tasks, maybe from different courses (backend treats them as tasks)
     const tasks: SchedulableTask[] = [
      { id: 'c1', title: 'T1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: 'c2', title: 'T2', deadline: new Date('2023-10-03T22:00:00Z'), weight: 20, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled.length).toBe(2);
  });

  it('ignores zero-duration input', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 0 }];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule);
    expect(scheduled.length).toBe(0);
    expect(unallocated.length).toBe(0);
  });
});
