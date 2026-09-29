import { TimeInterval } from './detectOverlap';
import { getZonedDateParts, zonedTimeToUtc } from './timezone';

export interface DailySchedule {
  startHour: number; // e.g. 8 for 08:00
  endHour: number;   // e.g. 22 for 22:00
}

/**
 * Finds available slots between a given start time (e.g. now) and an end time (e.g. deadline),
 * taking into account daily working hours in a specific timezone and existing busy intervals.
 * 
 * Boundaries are converted to UTC Date instances for storage and comparisons, keeping behavior
 * fully independent of the server's local timezone.
 */
export function findAvailableSlots(
  searchStart: Date,
  searchEnd: Date,
  busyIntervals: TimeInterval[],
  dailySchedule: DailySchedule = { startHour: 8, endHour: 22 },
  timeZone: string = 'Asia/Colombo'
): TimeInterval[] {
  const availableSlots: TimeInterval[] = [];
  
  // Sort busy intervals chronologically
  const sortedBusy = [...busyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Determine local date bounds in the study timezone
  const startParts = getZonedDateParts(searchStart, timeZone);
  const endParts = getZonedDateParts(searchEnd, timeZone);

  // Iterate day by day in local calendar date
  const currentLocal = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));
  const endLocal = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day));

  while (currentLocal <= endLocal) {
    const year = currentLocal.getUTCFullYear();
    const month = currentLocal.getUTCMonth() + 1;
    const day = currentLocal.getUTCDate();

    // Construct local daily window converted to UTC
    const slotStart = zonedTimeToUtc(year, month, day, dailySchedule.startHour, 0, 0, timeZone);
    const slotEnd = zonedTimeToUtc(year, month, day, dailySchedule.endHour, 0, 0, timeZone);

    // Adjust for search bounds
    const actualStart = new Date(Math.max(slotStart.getTime(), searchStart.getTime()));
    const actualEnd = new Date(Math.min(slotEnd.getTime(), searchEnd.getTime()));

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

    currentLocal.setUTCDate(currentLocal.getUTCDate() + 1);
  }

  return availableSlots;
}
