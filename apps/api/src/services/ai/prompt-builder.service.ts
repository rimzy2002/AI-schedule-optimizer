export class PromptBuilderService {
  buildSyllabusPrompt(rawText: string): string {
    return `
You are an expert AI assistant that extracts course tasks from raw syllabus text.
Your job is to read the provided syllabus and extract all actionable tasks like assignments, exams, quizzes, readings, and projects.

You MUST respond with a raw JSON object and nothing else. DO NOT wrap the output in markdown code fences (like \`\`\`json).

The JSON output MUST exactly match this structure:
{
  "course": "Name of the course",
  "tasks": [
    {
      "name": "Name of the task",
      "type": "assignment", // Must be one of: "assignment", "exam", "quiz", "project", "reading", "other"
      "weight": 25, // A number between 0 and 100 representing the percentage weight in the final grade. Use 0 if unknown.
      "deadline": "2026-10-14T23:59:00Z" // An ISO 8601 formatted date string, or null if no deadline is found.
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
