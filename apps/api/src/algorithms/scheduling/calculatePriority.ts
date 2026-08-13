export interface SchedulableTask {
  id: string;
  title: string;
  deadline: Date | null;
  weight: number | null;
  requiredStudyMinutes: number;
}

/**
 * Sorts tasks by priority.
 * Highest priority: Nearest deadline.
 * If deadlines are the same, highest weight goes first.
 * Tasks without deadlines go last.
 */
export function calculatePriority(tasks: SchedulableTask[]): SchedulableTask[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) {
      const timeDiff = a.deadline.getTime() - b.deadline.getTime();
      if (timeDiff !== 0) return timeDiff;
      // same deadline, higher weight first
      return (b.weight || 0) - (a.weight || 0);
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    // neither has deadline, sort by weight
    return (b.weight || 0) - (a.weight || 0);
  });
}
