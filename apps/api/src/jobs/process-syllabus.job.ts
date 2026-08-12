export interface ProcessSyllabusJobData {
  rawText: string;
}

export interface ProcessSyllabusJobResult {
  course: string;
  tasks: Array<{
    name: string;
    type: 'assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other';
    weight: number;
    deadline: string | null;
  }>;
}
