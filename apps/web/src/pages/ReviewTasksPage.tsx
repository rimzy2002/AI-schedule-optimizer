import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ParsedTask } from '../types';
import { ParsedTaskList } from '../components/syllabus/ParsedTaskList';
import { Button } from '../components/ui/Button';
import './ReviewTasksPage.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const ReviewTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { courseId?: string, syllabusId?: string } | null;
  
  const courseId = state?.courseId;
  const syllabusId = state?.syllabusId;
  
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [courseName, setCourseName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('No course selected');
      setIsLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      try {
        const res = await fetch(`${API_URL}/courses/${courseId}`);
        if (!res.ok) throw new Error('Failed to fetch course');
        const data = await res.json();
        setCourseName(data.title);
        
        const loadedTasks = data.tasks.map((t: any) => {
          let status = 'Ready';
          if (!t.deadline) status = 'CHECK DATE';
          else if (t.weight == null || t.weight === 0) status = 'MISSING WEIGHT';
          
          return {
            id: t.id,
            name: t.title,
            type: t.type || 'other',
            weight: t.weight,
            deadline: t.deadline,
            status
          };
        });
        setTasks(loadedTasks);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const hasErrors = tasks.some(t => t.status !== 'Ready' && t.status !== 'NEW');

  const handleConfirm = async () => {
    if (hasErrors || !courseId) return;
    
    setIsSubmitting(true);
    try {
      // 1. Confirm and save tasks
      const res = await fetch(`${API_URL}/tasks/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          tasks: tasks.map(t => ({
            name: t.name,
            type: t.type,
            weight: t.weight,
            deadline: t.deadline
          }))
        })
      });

      if (!res.ok) {
        throw new Error('Failed to confirm tasks');
      }

      // 2. Generate Schedule
      const scheduleRes = await fetch(`${API_URL}/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });

      if (!scheduleRes.ok) {
        throw new Error('Failed to generate schedule');
      }

      const scheduleData = await scheduleRes.json();
      
      // 3. Navigate to schedule page
      navigate('/schedule', { state: { scheduleId: scheduleData.id, courseId } });
      
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

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
            {isSubmitting ? 'Generating Schedule...' : 'Confirm Tasks & Generate Schedule'}
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
