export interface ParsedTask {
  id: string;
  name: string;
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other';
  weight: number | null;
  deadline: string | null;
  is_date_only?: boolean;
  isDateOnly?: boolean;
  estimated_duration?: number | null;
  description?: string | null;
  recurring?: boolean;
  syllabus_id?: string | null;
  status: 'Ready' | 'CHECK DATE' | 'MISSING WEIGHT' | 'NEW';
  version?: number;
  updated_at?: string;
}
