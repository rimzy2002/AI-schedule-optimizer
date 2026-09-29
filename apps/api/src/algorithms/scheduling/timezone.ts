export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts calendar date and time parts in a specific IANA timezone,
 * completely independent of the host machine's timezone.
 */
export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(p => [p.type, p.value])
  );
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

/**
 * Converts a local wall-clock date and time in the specified IANA timezone
 * to an absolute UTC Date instance.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number = 0,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(guess).map(p => [p.type, p.value])
  );
  const tzDate = new Date(Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    parseInt(parts.hour, 10),
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10)
  ));
  const offset = tzDate.getTime() - guess.getTime();
  return new Date(guess.getTime() - offset);
}

/**
 * Documented Academic Local-Time Policy for Deadlines:
 * 
 * 1. Explicit Timestamp Deadlines:
 *    If a task has an explicit timestamp (isDateOnly === false), the deadline is preserved
 *    EXACTLY as specified (even if it occurs at local midnight or UTC midnight).
 * 
 * 2. Date-Only Deadlines:
 *    If a task is marked as date-only (isDateOnly === true) or stored as a UTC-midnight
 *    calendar-date carrier, it represents a calendar date without an explicit time.
 *    Extract the original calendar date from UTC components (preserving the intended
 *    calendar date across all timezones including America/New_York), then construct
 *    the study-day closing time (studyEndHour:00) on that date in the user's timezone.
 */
export function resolveTaskDeadline(
  deadline: Date | string | null,
  isDateOnly: boolean,
  timeZone: string = 'Asia/Colombo',
  studyEndHour: number = 22
): Date | null {
  if (!deadline) return null;

  if (!isDateOnly) {
    // Preserve explicit timestamp deadlines exactly
    return new Date(deadline);
  }

  // Date-only deadlines are stored as UTC-midnight calendar-date carriers.
  // Extract the original calendar date directly using UTC components so dates do not shift backward in Western timezones.
  let year: number;
  let month: number;
  let day: number;

  if (typeof deadline === 'string') {
    const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(deadline);
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
      day = d.getUTCDate();
    }
  } else {
    year = deadline.getUTCFullYear();
    month = deadline.getUTCMonth() + 1;
    day = deadline.getUTCDate();
  }

  // Construct the configured study-day closing time on that calendar date in user's timezone:
  return zonedTimeToUtc(
    year,
    month,
    day,
    studyEndHour,
    0,
    0,
    timeZone
  );
}
