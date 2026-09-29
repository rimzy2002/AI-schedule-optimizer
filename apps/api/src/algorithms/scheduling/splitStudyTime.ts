export interface StudyBlockPlan {
  durationMinutes: number;
}

/**
 * Splits a total required study time into manageable blocks respecting maxSessionDuration.
 * Preserves total required study minutes while ensuring all generated blocks respect
 * the configured maximum session duration.
 */
export function splitStudyTime(
  totalMinutes: number, 
  minBlockMinutes = 30, 
  maxBlockMinutes = 120
): StudyBlockPlan[] {
  if (totalMinutes <= 0) return [];

  const effectiveMax = Math.max(15, maxBlockMinutes);
  if (totalMinutes <= effectiveMax) {
    return [{ durationMinutes: totalMinutes }];
  }

  const effectiveMin = Math.min(minBlockMinutes, effectiveMax);
  const blocks: StudyBlockPlan[] = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    if (remaining > effectiveMax) {
      const remAfter = remaining - effectiveMax;
      // If remainder would be smaller than min block, split evenly between this block and next
      if (remAfter > 0 && remAfter < effectiveMin) {
        const half = Math.ceil(remaining / 2);
        const first = Math.min(effectiveMax, half);
        blocks.push({ durationMinutes: first });
        remaining -= first;
      } else {
        blocks.push({ durationMinutes: effectiveMax });
        remaining -= effectiveMax;
      }
    } else {
      blocks.push({ durationMinutes: remaining });
      remaining = 0;
    }
  }

  return blocks;
}
