export interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Checks if a proposed time block overlaps with any existing intervals.
 */
export function detectOverlap(proposed: TimeInterval, existing: TimeInterval[]): boolean {
  for (const interval of existing) {
    if (proposed.start < interval.end && proposed.end > interval.start) {
      return true; // overlap found
    }
  }
  return false;
}

/**
 * Checks if a proposed block fits entirely within an available slot.
 */
export function fitsInSlot(proposed: TimeInterval, slot: TimeInterval): boolean {
  return proposed.start >= slot.start && proposed.end <= slot.end;
}
