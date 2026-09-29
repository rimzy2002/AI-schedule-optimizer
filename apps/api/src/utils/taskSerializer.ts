/**
 * Utilities for consistent public API serialization of tasks and deadlines.
 *
 * Public API Representation:
 * - Date-only deadline: YYYY-MM-DD string with is_date_only=true
 * - Timed deadline: Full ISO timestamp with explicit offset/Z with is_date_only=false
 * - Null deadline: null with is_date_only=false
 */

export function serializeTaskDeadline(deadline: Date | null, isDateOnly: boolean): string | null {
  if (!deadline) return null;
  if (isDateOnly) {
    const year = deadline.getUTCFullYear();
    const month = String(deadline.getUTCMonth() + 1).padStart(2, '0');
    const day = String(deadline.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return deadline.toISOString();
}

export function serializeTask<T extends { deadline: Date | null; is_date_only: boolean }>(
  task: T
): Omit<T, 'deadline'> & { deadline: string | null; is_date_only: boolean } {
  return {
    ...task,
    deadline: serializeTaskDeadline(task.deadline, task.is_date_only),
    is_date_only: Boolean(task.is_date_only),
  };
}

export function serializeTasks<T extends { deadline: Date | null; is_date_only: boolean }>(
  tasks: T[]
): Array<Omit<T, 'deadline'> & { deadline: string | null; is_date_only: boolean }> {
  return tasks.map(serializeTask);
}

export function serializeCourseWithTasks<T extends { tasks?: Array<{ deadline: Date | null; is_date_only: boolean }> }>(
  course: T
): T {
  if (!course) return course;
  return {
    ...course,
    tasks: course.tasks ? serializeTasks(course.tasks) : course.tasks,
  };
}
