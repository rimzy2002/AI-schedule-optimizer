export class PromptBuilderService {
  buildSyllabusPrompt(rawText: string): string {
    return `
You are an expert AI assistant that extracts course tasks from raw syllabus text.
Your job is to read the provided syllabus and extract all actionable tasks like assignments, exams, quizzes, readings, and projects.

You MUST respond with a raw JSON object and nothing else. DO NOT wrap the output in markdown code fences (like \`\`\`json).

The JSON output MUST exactly match this structure:
{
  "course": "Name of the course",
  "courseCode": "Course code (e.g., CS 301), if available, otherwise null",
  "instructor": "Name of the instructor, if available, otherwise null",
  "semester": "Semester (e.g., Fall 2026), if available, otherwise null",
  "tasks": [
    {
      "name": "Name of the task",
      "type": "assignment", // Must be strictly one of: "assignment", "quiz", "exam", "project", "presentation", "reading", "discussion", or "other"
      "weight": 25, // A number between 0 and 100 representing the percentage weight. Use 0 if unknown.
      "deadline": "2026-10-14T17:00:00Z", // An ISO 8601 string if an explicit time is given (e.g. "2026-10-14T17:00:00Z"), or a date string "YYYY-MM-DD" if only a date is given (do NOT invent a time). Null if no deadline is found.
      "isDateOnly": true, // true if the deadline has no explicit time, false if a specific time is specified in the syllabus.
      "estimatedDuration": 120, // Estimated duration in minutes if provided, otherwise null. (e.g. 2 hours -> 120)
      "description": "Brief description of the task, if any, otherwise null.",
      "recurring": false // true if the task is a recurring weekly/monthly task, false otherwise.
    }
  ]
}

Syllabus Text:
"""
${rawText}
"""
    `.trim();
  }
}

export const promptBuilderService = new PromptBuilderService();
