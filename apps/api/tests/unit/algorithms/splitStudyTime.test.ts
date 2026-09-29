import { describe, it, expect } from 'vitest';
import { splitStudyTime } from '../../../src/algorithms/scheduling/splitStudyTime';

describe('splitStudyTime with maxSessionDuration', () => {
  it('returns empty array when totalMinutes is 0 or negative', () => {
    expect(splitStudyTime(0)).toEqual([]);
    expect(splitStudyTime(-10)).toEqual([]);
  });

  it('keeps single block when totalMinutes <= maxBlockMinutes', () => {
    const blocks = splitStudyTime(60, 30, 90);
    expect(blocks).toEqual([{ durationMinutes: 60 }]);
  });

  it('splits tasks exceeding maxSessionDuration and strictly preserves total minutes', () => {
    const totalMinutes = 180;
    const maxSessionDuration = 60;
    const blocks = splitStudyTime(totalMinutes, 30, maxSessionDuration);

    // Every block must respect the configured maximum
    for (const b of blocks) {
      expect(b.durationMinutes).toBeLessThanOrEqual(maxSessionDuration);
    }

    // Total minutes must be exactly preserved
    const total = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
    expect(total).toBe(totalMinutes);
    expect(blocks.length).toBe(3);
    expect(blocks.map(b => b.durationMinutes)).toEqual([60, 60, 60]);
  });

  it('handles awkward duration without creating tiny slivers or dropping minutes', () => {
    const totalMinutes = 75;
    const maxSessionDuration = 60;
    const blocks = splitStudyTime(totalMinutes, 30, maxSessionDuration);

    for (const b of blocks) {
      expect(b.durationMinutes).toBeLessThanOrEqual(maxSessionDuration);
    }

    const total = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
    expect(total).toBe(totalMinutes);
    expect(blocks.length).toBe(2);
  });

  it('respects short maxSessionDuration (e.g. 45 mins)', () => {
    const totalMinutes = 120;
    const maxSessionDuration = 45;
    const blocks = splitStudyTime(totalMinutes, 30, maxSessionDuration);

    for (const b of blocks) {
      expect(b.durationMinutes).toBeLessThanOrEqual(maxSessionDuration);
    }

    const total = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
    expect(total).toBe(totalMinutes);
    expect(blocks.length).toBe(3);
  });

  it('preserves total study minutes across arbitrary configured durations', () => {
    const testCases = [
      { total: 45, max: 30 },
      { total: 100, max: 45 },
      { total: 150, max: 60 },
      { total: 200, max: 90 },
      { total: 240, max: 60 },
      { total: 300, max: 120 },
      { total: 17, max: 15 },
    ];

    for (const tc of testCases) {
      const blocks = splitStudyTime(tc.total, 30, tc.max);
      for (const b of blocks) {
        expect(b.durationMinutes).toBeLessThanOrEqual(tc.max);
      }
      const sum = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);
      expect(sum).toBe(tc.total);
    }
  });
});
