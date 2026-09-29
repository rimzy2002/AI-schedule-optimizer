import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { ParsedTask } from '../types';
import { ParsedTaskList } from '../components/syllabus/ParsedTaskList';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../services/apiClient';
import './ReviewTasksPage.css';

export const ReviewTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ courseId?: string }>();
  const state = location.state as { courseId?: string, syllabusId?: string } | null;
  
  const queryParams = new URLSearchParams(location.search);
  const courseId = params.courseId || state?.courseId || queryParams.get('courseId') || sessionStorage.getItem('last_reviewed_course_id') || null;
  const syllabusId = state?.syllabusId || queryParams.get('syllabusId') || null;
  
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [courseName, setCourseName] = useState('');
  const [isLoading, setIsLoading] = useState(() => Boolean(courseId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      sessionStorage.setItem('last_reviewed_course_id', courseId);
    }
  }, [courseId]);

  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get(`/courses/${courseId}`);
      setCourseName(data.title);
      
      const loadedTasks = (data.tasks || []).map((t: any) => {
        let deadline = t.deadline;
        const isDateOnly = Boolean(t.is_date_only);
        if (isDateOnly && deadline && /^\d{4}-\d{2}-\d{2}T/.test(deadline)) {
          deadline = deadline.split('T')[0];
        }

        let status: ParsedTask['status'] = 'Ready';
        if (!deadline) {
          status = 'CHECK DATE';
        }
        
        return {
          id: t.id,
          name: t.title,
          type: t.type || 'other',
          weight: t.weight !== undefined ? t.weight : null,
          estimated_duration: t.estimated_duration || null,
          description: t.description || null,
          recurring: !!t.recurring,
          syllabus_id: t.syllabus_id || syllabusId,
          deadline,
          is_date_only: isDateOnly,
          status,
          updated_at: t.updated_at,
          version: t.version,
        };
      });
      setTasks(loadedTasks);
    } catch (err: any) {
      setError(err.message || 'Failed to load course tasks');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, syllabusId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const hasErrors = tasks.some(t => !t.name || !t.deadline || t.status === 'CHECK DATE');

  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (hasErrors || !courseId) return;
    
    setIsSubmitting(true);
    setConfirmError(null);
    try {
      // 1. Confirm and save tasks with complete lossless fields and versions for concurrency protection
      await apiClient.post('/tasks/confirm', {
        courseId,
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          weight: t.weight,
          estimated_duration: t.estimated_duration,
          description: t.description,
          recurring: t.recurring,
          syllabus_id: t.syllabus_id || syllabusId,
          deadline: t.deadline,
          is_date_only: t.is_date_only,
          version: t.version,
          expected_version: t.version,
          expected_updated_at: t.updated_at,
        }))
      });

      // 2. Generate Schedule
      const scheduleData = await apiClient.post('/schedule/generate', { courseId });
      
      // 3. Navigate to durable schedule URL
      navigate(`/schedule/${scheduleData.id}`, { state: { scheduleId: scheduleData.id, courseId } });
      
    } catch (e: any) {
      console.error(e);
      setConfirmError(e.message || 'Error confirming tasks or generating schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-secondary">Loading tasks...</div>;
  }

  if (!courseId) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <Card className="p-8">
          <h2 className="text-xl font-bold text-primary mb-3">No Course Selected</h2>
          <p className="text-secondary text-sm mb-6">
            Please select a course or import a syllabus to review tasks.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="primary" fullWidth onClick={() => navigate('/courses')}>
              View Courses
            </Button>
            <Button variant="outline" fullWidth onClick={() => navigate('/import')}>
              Import Syllabus
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <Card className="p-8 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Tasks</h2>
          <p className="text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => fetchCourseData()}>
              Retry
            </Button>
            <Button variant="primary" onClick={() => navigate('/courses')}>
              Back to Courses
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="mb-4">
        <Link to="/courses" className="text-secondary hover:text-primary text-sm font-medium flex items-center gap-1">
          ← Back to Courses
        </Link>
      </div>

      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title mb-1">Review Extracted Tasks</h1>
            {courseName && <h2 className="text-xl font-semibold mb-2">{courseName}</h2>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchCourseData()}>
            ↻ Refresh Tasks
          </Button>
        </div>
        <p className="page-subtitle">
          AI detected these assignments from your syllabus. Review, edit deadlines or estimated duration before generating your schedule.
        </p>
      </div>

      <div className="review-content">
        {confirmError && (
          <div className="p-4 mb-6 bg-error-subtle border border-error text-error rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">⚠</span>
              <span className="text-sm font-medium">{confirmError}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setConfirmError(null); fetchCourseData(); }}>
              Refresh Tasks
            </Button>
          </div>
        )}

        <div className="review-summary-box mb-6">
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span className="text-body font-medium">{tasks.length} tasks ready</span>
            {hasErrors && (
              <>
                <span className="text-muted">•</span>
                <span className="text-warning font-medium">Needs deadline check</span>
              </>
            )}
          </div>
        </div>

        <ParsedTaskList tasks={tasks} courseId={courseId} onTasksChange={setTasks} />

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
              <span>⚠</span> Every task needs a deadline so the scheduler can place study sessions before it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
