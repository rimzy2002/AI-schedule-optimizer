import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScheduleSummary } from '../components/schedule/ScheduleSummary';
import { ScheduleCalendar } from '../components/schedule/ScheduleCalendar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ScheduleData {
  studyBlocks: any[];
  id: string;
  course_id: string;
  status: string;
}

export const SchedulePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { scheduleId?: string, courseId?: string } | null;
  const scheduleId = state?.scheduleId;

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const endpoint = scheduleId 
          ? `${API_URL}/schedule/${scheduleId}` 
          : `${API_URL}/schedule/latest`;
          
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setScheduleData(data);
        } else {
          console.error('Failed to fetch schedule');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, [scheduleId]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading your schedule...</div>;
  }

  if (!scheduleData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="flex flex-col items-center justify-center p-12 text-center border-error bg-error-subtle">
          <div className="text-error text-3xl mb-4">⚠</div>
          <h2 className="text-h2 text-error mb-2">Schedule Not Found</h2>
          <p className="text-body text-secondary mb-6">We couldn't find the requested schedule.</p>
          <div className="flex gap-4">
            <Button variant="primary" onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const calendarBlocks = scheduleData.studyBlocks.map(b => ({
    taskId: b.task_id,
    taskTitle: b.task?.title || 'Unknown Task',
    start: b.start_time,
    end: b.end_time
  }));

  const uniqueTasks = new Set(scheduleData.studyBlocks.map(b => b.task_id));

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="page-title mb-0">Generated Schedule</h1>
        <Button
          variant="primary"
          onClick={() => navigate('/')}
        >
          Go to Dashboard
        </Button>
      </div>

      <ScheduleSummary
        totalBlocks={calendarBlocks.length}
        deadlinesCovered={uniqueTasks.size}
        overlaps={0}
      />

      <ScheduleCalendar blocks={calendarBlocks} />
    </div>
  );
};
