import { TimeInterval } from './detectOverlap';

export interface StudyBlockPlan {
  durationMinutes: number;
}

/**
 * Splits a total required study time into manageable blocks.
 * For example, a 180 min task could be split into three 60 min blocks, 
 * or 60, 60, 60. Max block size is configurable (e.g. 120 mins).
 */
export function splitStudyTime(
  totalMinutes: number, 
  minBlockMinutes = 30, 
  maxBlockMinutes = 120
): StudyBlockPlan[] {
  if (totalMinutes <= 0) return [];

  const blocks: StudyBlockPlan[] = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    if (remaining > maxBlockMinutes) {
      blocks.push({ durationMinutes: maxBlockMinutes });
      remaining -= maxBlockMinutes;
    } else if (remaining < minBlockMinutes && blocks.length > 0) {
      // If a tiny chunk remains, try to add it to the last block if it doesn't exceed max too much,
      // or just treat it as a min block if it's the only one.
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock.durationMinutes + remaining <= maxBlockMinutes) {
        lastBlock.durationMinutes += remaining;
        remaining = 0;
      } else {
        blocks.push({ durationMinutes: minBlockMinutes });
        remaining = 0;
      }
    } else {
      blocks.push({ durationMinutes: remaining });
      remaining = 0;
    }
  }

  return blocks;
}
