import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  getDaysInMonth,
  isValidCalendarDate,
  validateDeadline,
} from '../../src/algorithms/scheduling/dateValidation';
import { syllabusTaskSchema } from '../../src/schemas/syllabus.schema';

describe('Strict Calendar Date and Deadline Validation', () => {
  describe('Leap Year and Days-in-Month Rules', () => {
    it('identifies standard and century leap years correctly', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2000)).toBe(true); // divisible by 400 -> leap year
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(1900)).toBe(false); // divisible by 100 but not 400 -> not leap year
      expect(isLeapYear(2100)).toBe(false);
    });

    it('returns the exact number of days for each month', () => {
      expect(getDaysInMonth(2026, 1)).toBe(31);  // Jan
      expect(getDaysInMonth(2026, 2)).toBe(28);  // Feb (common year)
      expect(getDaysInMonth(2024, 2)).toBe(29);  // Feb (leap year)
      expect(getDaysInMonth(1900, 2)).toBe(28);  // Feb (1900 not leap)
      expect(getDaysInMonth(2000, 2)).toBe(29);  // Feb (2000 is leap)
      expect(getDaysInMonth(2026, 3)).toBe(31);  // Mar
      expect(getDaysInMonth(2026, 4)).toBe(30);  // Apr
      expect(getDaysInMonth(2026, 5)).toBe(31);  // May
      expect(getDaysInMonth(2026, 6)).toBe(30);  // Jun
      expect(getDaysInMonth(2026, 7)).toBe(31);  // Jul
      expect(getDaysInMonth(2026, 8)).toBe(31);  // Aug
      expect(getDaysInMonth(2026, 9)).toBe(30);  // Sep
      expect(getDaysInMonth(2026, 10)).toBe(31); // Oct
      expect(getDaysInMonth(2026, 11)).toBe(30); // Nov
      expect(getDaysInMonth(2026, 12)).toBe(31); // Dec
      expect(getDaysInMonth(2026, 0)).toBe(0);   // Invalid month
      expect(getDaysInMonth(2026, 13)).toBe(0);  // Invalid month
    });

    it('validates calendar date boundaries accurately', () => {
      expect(isValidCalendarDate(2026, 10, 15)).toBe(true);
      expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
      expect(isValidCalendarDate(2025, 2, 29)).toBe(false); // Feb 29 non-leap
      expect(isValidCalendarDate(2026, 2, 30)).toBe(false); // Feb 30 impossible
      expect(isValidCalendarDate(2026, 4, 31)).toBe(false); // Apr 31 impossible
      expect(isValidCalendarDate(2026, 13, 1)).toBe(false);  // Month 13 impossible
      expect(isValidCalendarDate(2026, 0, 1)).toBe(false);   // Month 0 impossible
    });
  });

  describe('validateDeadline()', () => {
    describe('Date-only deadlines (YYYY-MM-DD)', () => {
      it('accepts valid date-only strings', () => {
        const res = validateDeadline('2026-10-15');
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(true);
      });

      it('accepts valid leap day (2024-02-29 and 2000-02-29)', () => {
        expect(validateDeadline('2024-02-29').isValid).toBe(true);
        expect(validateDeadline('2000-02-29').isValid).toBe(true);
      });

      it('rejects February 29 in non-leap years (2025-02-29 and 1900-02-29)', () => {
        const res2025 = validateDeadline('2025-02-29');
        expect(res2025.isValid).toBe(false);
        expect(res2025.error).toContain('Impossible calendar date');

        const res1900 = validateDeadline('1900-02-29');
        expect(res1900.isValid).toBe(false);
        expect(res1900.error).toContain('Impossible calendar date');
      });

      it('rejects February 30 unconditionally', () => {
        const res = validateDeadline('2026-02-30');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Impossible calendar date: 2026-02-30');
      });

      it('rejects impossible months like month 13 or month 00', () => {
        const res13 = validateDeadline('2026-13-01');
        expect(res13.isValid).toBe(false);
        expect(res13.error).toContain('Impossible calendar date: 2026-13-01');

        const res00 = validateDeadline('2026-00-15');
        expect(res00.isValid).toBe(false);
      });

      it('rejects days exceeding month length (e.g. April 31)', () => {
        const res = validateDeadline('2026-04-31');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Impossible calendar date: 2026-04-31');
      });

      it('rejects contradiction when date-only format has isDateOnly=false', () => {
        const res = validateDeadline('2026-10-15', false);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Contradiction');
      });

      it('allows date-only format with isDateOnly=true', () => {
        const res = validateDeadline('2026-10-15', true);
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(true);
      });
    });

    describe('Timed timestamps and explicit timezone offsets', () => {
      it('accepts valid +05:30 (Asia/Colombo) timestamp', () => {
        const res = validateDeadline('2026-10-15T20:00:00+05:30');
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(false);
      });

      it('accepts UTC timestamps with Z and millisecond precision', () => {
        const resZ = validateDeadline('2026-10-15T14:30:00Z');
        expect(resZ.isValid).toBe(true);
        expect(resZ.isDateOnly).toBe(false);

        const resMs = validateDeadline('2026-10-15T14:30:00.123Z');
        expect(resMs.isValid).toBe(true);
        expect(resMs.isDateOnly).toBe(false);
      });

      it('rejects impossible dates embedded in timestamps (e.g. Feb 30)', () => {
        const res = validateDeadline('2026-02-30T14:30:00Z');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Impossible calendar date in timestamp');
      });

      it('rejects impossible months embedded in timestamps (e.g. Month 13)', () => {
        const res = validateDeadline('2026-13-10T14:30:00+05:30');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Impossible calendar date in timestamp');
      });

      it('rejects invalid time of day hours/minutes/seconds', () => {
        const resHour = validateDeadline('2026-10-15T24:00:00Z');
        expect(resHour.isValid).toBe(false);
        expect(resHour.error).toContain('Invalid time of day');

        const resMin = validateDeadline('2026-10-15T12:60:00Z');
        expect(resMin.isValid).toBe(false);
        expect(resMin.error).toContain('Invalid time of day');
      });

      it('rejects invalid timezone offset hours (e.g. +25:00)', () => {
        const res = validateDeadline('2026-10-15T12:00:00+25:00');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Invalid timezone offset bounds');
      });

      it('rejects invalid timezone offset minutes (e.g. +05:99)', () => {
        const res = validateDeadline('2026-10-15T12:00:00+05:99');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Invalid timezone offset bounds');
      });

      it('rejects contradiction when timed timestamp has isDateOnly=true', () => {
        const res = validateDeadline('2026-10-15T20:00:00+05:30', true);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Contradiction');
      });

      it('allows timed timestamp with isDateOnly=false', () => {
        const res = validateDeadline('2026-10-15T20:00:00+05:30', false);
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(false);
      });
    });

    describe('Null, undefined, and empty string handling', () => {
      it('treats null as valid with isDateOnly=false', () => {
        const res = validateDeadline(null);
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(false);
      });

      it('treats undefined as valid with isDateOnly=false', () => {
        const res = validateDeadline(undefined);
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(false);
      });

      it('treats empty string as valid with isDateOnly=false', () => {
        const res = validateDeadline('');
        expect(res.isValid).toBe(true);
        expect(res.isDateOnly).toBe(false);
      });

      it('rejects random strings that are not dates', () => {
        const res = validateDeadline('next-monday');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Invalid deadline format');
      });
    });
  });

  describe('Zod Schema Integration: syllabusTaskSchema', () => {
    it('successfully parses valid tasks with date-only or timed deadlines', () => {
      const validDateOnly = syllabusTaskSchema.safeParse({
        name: 'Math Homework',
        type: 'assignment',
        weight: 10,
        deadline: '2026-10-15',
        isDateOnly: true,
      });
      expect(validDateOnly.success).toBe(true);

      const validTimed = syllabusTaskSchema.safeParse({
        name: 'Midterm Exam',
        type: 'exam',
        weight: 30,
        deadline: '2026-10-15T20:00:00+05:30',
        isDateOnly: false,
      });
      expect(validTimed.success).toBe(true);
    });

    it('rejects tasks with February 30', () => {
      const result = syllabusTaskSchema.safeParse({
        name: 'Impossible Deadline',
        type: 'assignment',
        weight: 10,
        deadline: '2026-02-30',
        isDateOnly: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Impossible calendar date: 2026-02-30');
      }
    });

    it('rejects tasks with month 13', () => {
      const result = syllabusTaskSchema.safeParse({
        name: 'Month 13 Assignment',
        type: 'assignment',
        weight: 10,
        deadline: '2026-13-01',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Impossible calendar date');
      }
    });

    it('rejects tasks with invalid timezone offset +25:00', () => {
      const result = syllabusTaskSchema.safeParse({
        name: 'Bad Offset Task',
        type: 'assignment',
        weight: 10,
        deadline: '2026-10-15T12:00:00+25:00',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid timezone offset bounds');
      }
    });

    it('rejects tasks with contradictory isDateOnly flags', () => {
      const result = syllabusTaskSchema.safeParse({
        name: 'Contradictory Task',
        type: 'assignment',
        weight: 10,
        deadline: '2026-10-15T20:00:00+05:30',
        isDateOnly: true, // Contradiction: timed timestamp but marked as date-only
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Contradiction');
      }
    });
  });
});
