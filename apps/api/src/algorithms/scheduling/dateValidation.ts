export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  isDateOnly?: boolean;
}

/**
 * Checks whether a given year is a leap year in the Gregorian calendar.
 * Leap years are divisible by 4, except end-of-century years which must be divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the maximum number of days in a given month for a given year.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 1: // January
    case 3: // March
    case 5: // May
    case 7: // July
    case 8: // August
    case 10: // October
    case 12: // December
      return 31;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      return 30;
    case 2: // February
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Validates that year, month, and day constitute a real, existing calendar date.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

/**
 * Validates a deadline string and optional isDateOnly flag strictly against:
 * 1. Real calendar dates (rejects month 13, Feb 30, non-leap Feb 29, etc.)
 * 2. Valid timestamp syntax, hour/minute/second bounds, and UTC offsets (e.g. +05:30)
 * 3. Contradictions between deadline format and explicit isDateOnly flag
 */
export function validateDeadline(
  deadline: string | null | undefined,
  isDateOnly?: boolean
): DateValidationResult {
  if (deadline === null || deadline === undefined || deadline === '') {
    return { isValid: true, isDateOnly: false };
  }

  const trimmed = deadline.trim();

  // Pattern 1: Date-only (YYYY-MM-DD)
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10);
    const day = parseInt(dateOnlyMatch[3], 10);

    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        error: `Impossible calendar date: ${trimmed} (month ${month}, day ${day} in year ${year} does not exist)`,
      };
    }

    if (isDateOnly === false) {
      return {
        isValid: false,
        error: `Contradiction: Date-only deadline "${trimmed}" cannot have isDateOnly set to false`,
      };
    }

    return { isValid: true, isDateOnly: true };
  }

  // Pattern 2: Timed ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss...)
  const timedMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}(?::?\d{2})?)$/
  );

  if (timedMatch) {
    const year = parseInt(timedMatch[1], 10);
    const month = parseInt(timedMatch[2], 10);
    const day = parseInt(timedMatch[3], 10);
    const hour = parseInt(timedMatch[4], 10);
    const minute = parseInt(timedMatch[5], 10);
    const second = timedMatch[6] ? parseInt(timedMatch[6], 10) : 0;
    const offsetStr = timedMatch[7];

    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        error: `Impossible calendar date in timestamp: ${trimmed} (month ${month}, day ${day} in year ${year} does not exist)`,
      };
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return {
        isValid: false,
        error: `Invalid time of day in timestamp: ${trimmed}`,
      };
    }

    // Validate timezone offset
    if (offsetStr !== 'Z') {
      const offsetMatch = offsetStr.match(/^([+-])(\d{2}):?(\d{2})?$/);
      if (!offsetMatch) {
        return {
          isValid: false,
          error: `Invalid timezone offset format in timestamp: ${offsetStr}`,
        };
      }
      const offsetHour = parseInt(offsetMatch[2], 10);
      const offsetMinute = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;

      if (offsetHour < 0 || offsetHour > 14 || offsetMinute < 0 || offsetMinute > 59) {
        return {
          isValid: false,
          error: `Invalid timezone offset bounds in timestamp: ${offsetStr} (hours 0-14, minutes 0-59)`,
        };
      }
    }

    // Check JavaScript Date parsing
    const parsedDate = new Date(trimmed);
    if (isNaN(parsedDate.getTime())) {
      return {
        isValid: false,
        error: `Unparseable timestamp: ${trimmed}`,
      };
    }

    if (isDateOnly === true) {
      return {
        isValid: false,
        error: `Contradiction: Timed deadline "${trimmed}" cannot have isDateOnly set to true`,
      };
    }

    return { isValid: true, isDateOnly: false };
  }

  return {
    isValid: false,
    error: `Invalid deadline format: "${trimmed}". Must be YYYY-MM-DD or ISO 8601 with timezone offset (e.g. 2026-10-15T20:00:00+05:30 or Z).`,
  };
}
