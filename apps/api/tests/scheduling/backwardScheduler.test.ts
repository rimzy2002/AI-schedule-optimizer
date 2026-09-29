import { describe, it, expect } from 'vitest';
import { backwardSchedule } from '../../src/algorithms/scheduling/backwardScheduler';
import { SchedulableTask } from '../../src/algorithms/scheduling/calculatePriority';
import { TimeInterval } from '../../src/algorithms/scheduling/detectOverlap';
import { findAvailableSlots } from '../../src/algorithms/scheduling/findAvailableSlots';
import { getZonedDateParts, zonedTimeToUtc, resolveTaskDeadline } from '../../src/algorithms/scheduling/timezone';

describe('backwardScheduler', () => {
  const scheduleStart = new Date('2023-10-01T08:00:00Z');
  const dailySchedule = { startHour: 8, endHour: 22 };

  it('schedules a single task', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(unallocated.length).toBe(0);
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].start.getTime()).toBe(new Date('2023-10-02T21:00:00Z').getTime());
  });

  it('schedules multiple tasks', () => {
    const tasks: SchedulableTask[] = [
      { id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: '2', title: 'Task 2', deadline: new Date('2023-10-03T22:00:00Z'), weight: 20, requiredStudyMinutes: 120 },
    ];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(unallocated.length).toBe(0);
    expect(scheduled.length).toBe(2);
  });

  it('handles same deadline by priority', () => {
    const deadline = new Date('2023-10-02T22:00:00Z');
    const tasks: SchedulableTask[] = [
      { id: 'low-weight', title: 'T1', deadline, weight: 10, requiredStudyMinutes: 60 },
      { id: 'high-weight', title: 'T2', deadline, weight: 50, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    const t1Block = scheduled.find(s => s.taskId === 'low-weight')!;
    const t2Block = scheduled.find(s => s.taskId === 'high-weight')!;
    expect(t2Block.start.getTime()).toBeGreaterThan(t1Block.start.getTime());
  });

  it('avoids calendar conflict', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    const busy: TimeInterval[] = [{ start: new Date('2023-10-02T20:00:00Z'), end: new Date('2023-10-02T22:00:00Z') }];
    const { scheduled } = backwardSchedule(tasks, busy, scheduleStart, dailySchedule, 'UTC');
    expect(scheduled[0].end.getTime()).toBeLessThanOrEqual(new Date('2023-10-02T20:00:00Z').getTime());
  });

  it('handles no available slot', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-01T09:00:00Z'), weight: 10, requiredStudyMinutes: 120 }];
    const { unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(unallocated.length).toBeGreaterThan(0);
  });

  it('splits task larger than one block', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 180 }];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled.length).toBeGreaterThan(1);
    const totalAllocated = scheduled.reduce((sum, b) => sum + (b.end.getTime() - b.start.getTime()) / 60000, 0);
    expect(totalAllocated).toBe(180);
  });

  it('schedules deadline tomorrow', () => {
    const tomorrow = new Date(scheduleStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: tomorrow, weight: 10, requiredStudyMinutes: 60 }];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled[0].end.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
  });

  it('handles deadline already passed', () => {
    const past = new Date(scheduleStart.getTime() - 86400000);
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: past, weight: 10, requiredStudyMinutes: 60 }];
    const { unallocated, scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled.length).toBe(0);
    expect(unallocated.length).toBe(1);
  });

  it('event exactly touches boundary', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 }];
    const busy: TimeInterval[] = [{ start: new Date('2023-10-02T21:00:00Z'), end: new Date('2023-10-02T22:00:00Z') }];
    const { scheduled } = backwardSchedule(tasks, busy, scheduleStart, dailySchedule, 'UTC');
    expect(scheduled[0].end.getTime()).toBe(new Date('2023-10-02T21:00:00Z').getTime());
  });

  it('correctly handles Asia/Colombo (+05:30) timezone study windows without morning skew', () => {
    // In Asia/Colombo (UTC+05:30), daily hours 08:00 - 22:00 map to 02:30 - 16:30 UTC.
    // Ensure that findAvailableSlots never produces slots past 16:30 UTC (which would be 22:00 local Colombo time).
    const start = new Date('2026-10-01T00:00:00.000Z');
    const end = new Date('2026-10-02T23:59:59.000Z');

    const slotsColombo = findAvailableSlots(start, end, [], dailySchedule, 'Asia/Colombo');
    expect(slotsColombo.length).toBeGreaterThan(0);

    for (const slot of slotsColombo) {
      const startParts = getZonedDateParts(slot.start, 'Asia/Colombo');
      const endParts = getZonedDateParts(slot.end, 'Asia/Colombo');

      // Local hour must be >= 8 and <= 22 in Asia/Colombo
      expect(startParts.hour).toBeGreaterThanOrEqual(8);
      expect(endParts.hour).toBeLessThanOrEqual(22);

      // Converted UTC end must NOT exceed 16:30 UTC for the current day
      // (ensuring students are not scheduled to study until 03:30 next morning)
      expect(slot.end.getUTCHours() <= 16 || (slot.end.getUTCHours() === 16 && slot.end.getUTCMinutes() <= 30)).toBe(true);
    }
  });

  it('correctly handles UTC timezone boundaries', () => {
    const start = new Date('2026-10-01T00:00:00.000Z');
    const end = new Date('2026-10-02T23:59:59.000Z');

    const slotsUtc = findAvailableSlots(start, end, [], dailySchedule, 'UTC');
    expect(slotsUtc.length).toBe(2); // Exactly 2 daily windows

    expect(slotsUtc[0].start.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(slotsUtc[0].end.toISOString()).toBe('2026-10-01T22:00:00.000Z');
    expect(slotsUtc[1].start.toISOString()).toBe('2026-10-02T08:00:00.000Z');
    expect(slotsUtc[1].end.toISOString()).toBe('2026-10-02T22:00:00.000Z');
  });

  it('preserves explicit midnight deadlines without overriding them', () => {
    // Explicit midnight timestamp deadline
    const explicitMidnight = new Date('2026-10-05T00:00:00.000Z');
    const resolved = resolveTaskDeadline(explicitMidnight, false, 'Asia/Colombo', 22);

    expect(resolved).not.toBeNull();
    // Must remain exactly 00:00:00Z, not modified to 22:00!
    expect(resolved?.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('applies documented local-time policy to date-only deadlines across multiple timezones including America/New_York', () => {
    // Date-only input representing 2026-10-05 stored as UTC-midnight carrier
    const dateOnlyInput = new Date('2026-10-05T00:00:00.000Z');
    
    // In Asia/Colombo, 22:00 on 2026-10-05 is 16:30 UTC on 2026-10-05
    const resolvedColombo = resolveTaskDeadline(dateOnlyInput, true, 'Asia/Colombo', 22);
    expect(resolvedColombo?.toISOString()).toBe('2026-10-05T16:30:00.000Z');
    const colomboParts = getZonedDateParts(resolvedColombo!, 'Asia/Colombo');
    expect(colomboParts.year).toBe(2026);
    expect(colomboParts.month).toBe(10);
    expect(colomboParts.day).toBe(5);
    expect(colomboParts.hour).toBe(22);

    // In UTC, 22:00 on 2026-10-05 is 22:00 UTC on 2026-10-05
    const resolvedUtc = resolveTaskDeadline(dateOnlyInput, true, 'UTC', 22);
    expect(resolvedUtc?.toISOString()).toBe('2026-10-05T22:00:00.000Z');
    const utcParts = getZonedDateParts(resolvedUtc!, 'UTC');
    expect(utcParts.year).toBe(2026);
    expect(utcParts.month).toBe(10);
    expect(utcParts.day).toBe(5);
    expect(utcParts.hour).toBe(22);

    // In America/New_York (UTC-4 in October), 21:00 on 2026-10-05 is 01:00 UTC on 2026-10-06.
    // The calendar date MUST NOT shift backward to Oct 4!
    const resolvedNY = resolveTaskDeadline(dateOnlyInput, true, 'America/New_York', 21);
    expect(resolvedNY?.toISOString()).toBe('2026-10-06T01:00:00.000Z');
    const nyParts = getZonedDateParts(resolvedNY!, 'America/New_York');
    expect(nyParts.year).toBe(2026);
    expect(nyParts.month).toBe(10);
    expect(nyParts.day).toBe(5); // Preserved calendar day 5!
    expect(nyParts.hour).toBe(21);
  });

  it('preserves calendar date in America/New_York across daylight-saving time transitions', () => {
    // US DST transition in 2026 occurs on Sunday, Nov 1, 2026 (EDT UTC-4 -> EST UTC-5)
    
    // 1. Day before transition (Oct 31, 2026 - EDT)
    const oct31 = new Date('2026-10-31T00:00:00.000Z');
    const resolvedOct31 = resolveTaskDeadline(oct31, true, 'America/New_York', 21);
    const partsOct31 = getZonedDateParts(resolvedOct31!, 'America/New_York');
    expect(partsOct31.year).toBe(2026);
    expect(partsOct31.month).toBe(10);
    expect(partsOct31.day).toBe(31);
    expect(partsOct31.hour).toBe(21);

    // 2. Day of transition (Nov 1, 2026 - EST starts)
    const nov1 = new Date('2026-11-01T00:00:00.000Z');
    const resolvedNov1 = resolveTaskDeadline(nov1, true, 'America/New_York', 21);
    const partsNov1 = getZonedDateParts(resolvedNov1!, 'America/New_York');
    expect(partsNov1.year).toBe(2026);
    expect(partsNov1.month).toBe(11);
    expect(partsNov1.day).toBe(1);
    expect(partsNov1.hour).toBe(21);
    // At 21:00 EST (UTC-5), UTC time is 02:00 UTC next day
    expect(resolvedNov1?.toISOString()).toBe('2026-11-02T02:00:00.000Z');

    // 3. Day after transition (Nov 2, 2026 - EST)
    const nov2 = new Date('2026-11-02T00:00:00.000Z');
    const resolvedNov2 = resolveTaskDeadline(nov2, true, 'America/New_York', 21);
    const partsNov2 = getZonedDateParts(resolvedNov2!, 'America/New_York');
    expect(partsNov2.year).toBe(2026);
    expect(partsNov2.month).toBe(11);
    expect(partsNov2.day).toBe(2);
    expect(partsNov2.hour).toBe(21);
  });

  it('handles local midnight boundaries correctly with zonedTimeToUtc', () => {
    // Local midnight in Asia/Colombo (00:00:00 on 2026-10-05) is 18:30:00 UTC on 2026-10-04
    const colomboMidnightUtc = zonedTimeToUtc(2026, 10, 5, 0, 0, 0, 'Asia/Colombo');
    expect(colomboMidnightUtc.toISOString()).toBe('2026-10-04T18:30:00.000Z');

    const parts = getZonedDateParts(colomboMidnightUtc, 'Asia/Colombo');
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(5);
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(0);
  });

  it('prevents study block overlap for multiple tasks', () => {
    const tasks: SchedulableTask[] = [
      { id: '1', title: 'T1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: '2', title: 'T2', deadline: new Date('2023-10-02T22:00:00Z'), weight: 20, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled.length).toBe(2);
    const b1 = scheduled[0];
    const b2 = scheduled[1];
    expect(b1.end.getTime()).toBeLessThanOrEqual(b2.start.getTime());
  });

  it('handles multiple courses via task list independently', () => {
     const tasks: SchedulableTask[] = [
      { id: 'c1', title: 'T1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 60 },
      { id: 'c2', title: 'T2', deadline: new Date('2023-10-03T22:00:00Z'), weight: 20, requiredStudyMinutes: 60 },
    ];
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled.length).toBe(2);
  });

  it('ignores zero-duration input', () => {
    const tasks: SchedulableTask[] = [{ id: '1', title: 'Task 1', deadline: new Date('2023-10-02T22:00:00Z'), weight: 10, requiredStudyMinutes: 0 }];
    const { scheduled, unallocated } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC');
    expect(scheduled.length).toBe(0);
    expect(unallocated.length).toBe(0);
  });

  it('respects custom maxSessionDuration when scheduling blocks', () => {
    const tasks: SchedulableTask[] = [
      { id: '1', title: 'Long Task', deadline: new Date('2023-10-02T22:00:00Z'), weight: 50, requiredStudyMinutes: 120 }
    ];
    // With maxSessionDuration = 45, 120 minutes should split into blocks of max 45 minutes
    const { scheduled } = backwardSchedule(tasks, [], scheduleStart, dailySchedule, 'UTC', 45);
    expect(scheduled.length).toBe(3);
    for (const block of scheduled) {
      const durationMins = (block.end.getTime() - block.start.getTime()) / 60000;
      expect(durationMins).toBeLessThanOrEqual(45);
    }
    const totalDuration = scheduled.reduce((sum, b) => sum + (b.end.getTime() - b.start.getTime()) / 60000, 0);
    expect(totalDuration).toBe(120);
  });
});

