import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ParsedTask } from '../types';
import { ParsedTaskList } from '../components/syllabus/ParsedTaskList';
import { Button } from '../components/ui/Button';
import './ReviewTasksPage.css';

// Mock initial data if none provided via router state
const mockTasks: ParsedTask[] = [
  { id: '1', name: 'Midterm Exam', type: 'exam', weight: 25, deadline: '2023-10-14T00:00:00Z', status: 'Ready' },
  { id: '2', name: 'Research Essay', type: 'assignment', weight: 30, deadline: '2023-10-29T00:00:00Z', status: 'Ready' },
  { id: '3', name: 'Quiz 3', type: 'quiz', weight: 10, deadline: null, status: 'CHECK DATE' },
];

export const ReviewTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { syllabusId?: string, proposedSyllabus?: ParsedTask[], courseName?: string } | null;
  
  const syllabusId = state?.syllabusId || '';
  const courseName = state?.courseName || '';
  const [tasks, setTasks] = useState<ParsedTask[]>(state?.proposedSyllabus || mockTasks);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasErrors = tasks.some(t => t.status !== 'Ready' && t.status !== 'NEW');

  const handleConfirm = async () => {
    if (hasErrors) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusId,
          tasks: tasks.map(t => ({
            name: t.name,
            type: t.type,
            weight: t.weight,
            deadline: t.deadline
          }))
        })
      });

      if (res.ok) {
        navigate('/schedule', { state: { syllabusId } });
      } else {
        alert('Failed to confirm tasks');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="review-page">
      <div className="page-header">
        <h1 className="page-title">Review Extracted Tasks</h1>
        {courseName && <h2 className="text-xl font-semibold mb-2">{courseName}</h2>}
        <p className="page-subtitle">
          AI detected these assignments from your syllabus. Review and correct anything before generating your schedule.
        </p>
      </div>

      <div className="review-content">
        {/* We could add the Summary Box here if needed: "6 tasks extracted • 1 date needs review" */}
        <div className="review-summary-box mb-6">
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span className="text-body font-medium">{tasks.length} tasks extracted</span>
            {hasErrors && (
              <>
                <span className="text-muted">•</span>
                <span className="text-warning font-medium">Needs review</span>
              </>
            )}
          </div>
        </div>

        <ParsedTaskList tasks={tasks} onTasksChange={setTasks} />

        <div className="flex flex-col items-end gap-2 mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            disabled={hasErrors || isSubmitting || tasks.length === 0}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Tasks & Generate Schedule'}
          </Button>
          {hasErrors && (
            <p className="text-sm text-warning mt-2 flex items-center gap-2">
              <span>⚠</span> Fix tasks marked "Needs attention" or "Check date" before generating your schedule.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
