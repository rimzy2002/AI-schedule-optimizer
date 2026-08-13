export interface ParsedTask {
  id: string; // Temporary ID for frontend editing
  name: string;
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other';
  weight: number;
  deadline: string | null;
  status: 'Ready' | 'CHECK DATE' | 'MISSING WEIGHT' | 'NEW';
}
