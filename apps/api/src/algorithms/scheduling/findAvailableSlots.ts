import { TimeInterval } from './detectOverlap';

export interface DailySchedule {
  startHour: number; // e.g. 9 for 09:00
  endHour: number;   // e.g. 22 for 22:00
}

/**
 * Finds available slots between a given start time (e.g. now) and an end time (e.g. deadline),
 * taking into account daily working hours and existing busy intervals.
 * 
 * Slots are returned in chronological order. For backward scheduling, they might be processed in reverse.
 */
export function findAvailableSlots(
  searchStart: Date,
  searchEnd: Date,
  busyIntervals: TimeInterval[],
  dailySchedule: DailySchedule = { startHour: 8, endHour: 22 }
): TimeInterval[] {
  const availableSlots: TimeInterval[] = [];
  
  // Sort busy intervals chronologically
  const sortedBusy = [...busyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Iterate day by day
  let currentDay = new Date(searchStart);
  currentDay.setUTCHours(0, 0, 0, 0);
  
  const endDay = new Date(searchEnd);
  endDay.setUTCHours(0, 0, 0, 0);

  while (currentDay <= endDay) {
    const slotStart = new Date(currentDay);
    slotStart.setUTCHours(dailySchedule.startHour, 0, 0, 0);
    
    const slotEnd = new Date(currentDay);
    slotEnd.setUTCHours(dailySchedule.endHour, 0, 0, 0);

    // Adjust for search bounds
    let actualStart = new Date(Math.max(slotStart.getTime(), searchStart.getTime()));
    let actualEnd = new Date(Math.min(slotEnd.getTime(), searchEnd.getTime()));

    if (actualStart < actualEnd) {
      // Find busy intervals that overlap with this day's slot
      const dayBusy = sortedBusy.filter(b => b.start < actualEnd && b.end > actualStart);
      
      let cursor = actualStart;
      for (const busy of dayBusy) {
        if (cursor < busy.start) {
          availableSlots.push({ start: new Date(cursor), end: new Date(busy.start) });
        }
        if (cursor < busy.end) {
          cursor = new Date(busy.end);
        }
      }
      
      if (cursor < actualEnd) {
        availableSlots.push({ start: new Date(cursor), end: new Date(actualEnd) });
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return availableSlots;
}
