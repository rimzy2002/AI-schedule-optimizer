import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { ScheduleSummary } from '../components/schedule/ScheduleSummary';
import { ScheduleCalendar, CalendarBlock } from '../components/schedule/ScheduleCalendar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { apiClient } from '../services/apiClient';
import { AlertCircle, Calendar as CalendarIcon, ArrowLeft, RefreshCw } from 'lucide-react';

interface StudyBlockData {
  id: string;
  task_id: string;
  course_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  task?: {
    id: string;
    title: string;
    deadline?: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

interface ScheduleData {
  id: string;
  course_id: string;
  status: string;
  created_at: string;
  studyBlocks: StudyBlockData[];
  course?: {
    id: string;
    title: string;
  };
}

interface ScheduleListItem {
  id: string;
  course_id: string;
  courseTitle: string;
  status: string;
  totalBlocks: number;
  created_at: string;
}

export const SchedulePage: React.FC = () => {
  const params = useParams<{ scheduleId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { scheduleId?: string, courseId?: string } | null;
  const activeScheduleId = params.scheduleId || state?.scheduleId;

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [allSchedules, setAllSchedules] = useState<ScheduleListItem[]>([]);
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Colombo');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Load user settings for timezone
  useEffect(() => {
    apiClient.get('/settings')
      .then(s => {
        if (s?.timezone) setUserTimezone(s.timezone);
      })
      .catch(() => {});
  }, []);

  // Fetch all saved schedules for switcher
  const fetchScheduleList = useCallback(async () => {
    try {
      const list = await apiClient.get('/schedule/list');
      setAllSchedules(list || []);
    } catch {
      // Non-critical, list remains empty
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const endpoint = activeScheduleId 
        ? `/schedule/${activeScheduleId}` 
        : `/schedule/latest`;
        
      const data = await apiClient.get(endpoint);
      setScheduleData(data);
      // If we fetched /latest without ID in URL, update URL durably
      if (!params.scheduleId && data?.id) {
        navigate(`/schedule/${data.id}`, { replace: true });
      }
    } catch (err: any) {
      if (err.status === 404) {
        setIsNotFound(true);
      } else {
        setError(err.message || 'Failed to load schedule');
      }
      setScheduleData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeScheduleId, params.scheduleId, navigate]);

  useEffect(() => {
    fetchSchedule();
    fetchScheduleList();
  }, [fetchSchedule, fetchScheduleList]);

  // Compute metrics
  const { calendarBlocks, uniqueTasksCount, completedCount, computedOverlaps } = useMemo(() => {
    if (!scheduleData?.studyBlocks) {
      return { calendarBlocks: [], uniqueTasksCount: 0, completedCount: 0, computedOverlaps: 0 };
    }

    const blocks = scheduleData.studyBlocks;
    const calBlocks: CalendarBlock[] = blocks.map(b => ({
      id: b.id,
      taskId: b.task_id,
      taskTitle: b.task?.title || b.title || 'Study Session',
      courseTitle: b.course?.title || scheduleData.course?.title,
      start: b.start_time,
      end: b.end_time,
      status: b.status,
    }));

    const uniqueTasks = new Set(blocks.map(b => b.task_id).filter(Boolean));
    const completed = blocks.filter(b => b.status === 'completed').length;

    // Computed overlaps
    const sorted = [...blocks].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    let overlaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (new Date(sorted[i].start_time).getTime() < new Date(sorted[i - 1].end_time).getTime()) {
        overlaps++;
      }
    }

    return {
      calendarBlocks: calBlocks,
      uniqueTasksCount: uniqueTasks.size,
      completedCount: completed,
      computedOverlaps: overlaps,
    };
  }, [scheduleData]);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-secondary">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent mb-3" />
        <p>Loading study schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="p-8 text-center border-error bg-error-subtle">
          <AlertCircle className="mx-auto text-error mb-3" size={36} />
          <h2 className="text-xl font-bold text-error mb-2">Error Loading Schedule</h2>
          <p className="text-secondary text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => fetchSchedule()}>
              <RefreshCw size={16} className="mr-1" /> Retry
            </Button>
            <Button variant="primary" onClick={() => navigate('/courses')}>
              Go to Courses
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isNotFound || !scheduleData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface border border-subtle flex items-center justify-center text-muted mb-4">
            <CalendarIcon size={24} />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">No Schedule Found</h2>
          <p className="text-secondary text-sm mb-6 max-w-md">
            {activeScheduleId 
              ? "The requested schedule could not be located. It may have been archived when a newer schedule was generated."
              : "You haven't generated a schedule yet. Confirm tasks in one of your courses to build your study plan."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {allSchedules.length > 0 && (
              <Button variant="secondary" onClick={() => navigate(`/schedule/${allSchedules[0].id}`)}>
                View Latest Schedule
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate('/courses')}>
              View Courses
            </Button>
            <Button variant="outline" onClick={() => navigate('/import')}>
              Import Syllabus
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scheduleOptions = allSchedules.map(s => {
    const dateFormatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(s.created_at));
    return {
      value: s.id,
      label: `${s.courseTitle} (${s.totalBlocks} blocks) - ${dateFormatted}${s.status === 'active' ? ' [Active]' : ''}`
    };
  });

  return (
    <div className="py-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/courses" className="text-secondary hover:text-primary text-xs font-semibold flex items-center gap-1">
              <ArrowLeft size={14} /> Courses
            </Link>
            <span className="text-muted text-xs">•</span>
            <span className="text-xs font-bold text-primary">
              {scheduleData.course?.title || 'Study Schedule'}
            </span>
          </div>
          <h1 className="page-title mb-0">Generated Schedule</h1>
        </div>

        <div className="flex items-center gap-3">
          {scheduleOptions.length > 1 && (
            <div className="w-64">
              <Select
                value={scheduleData.id}
                onChange={(e) => navigate(`/schedule/${e.target.value}`)}
                options={scheduleOptions}
              />
            </div>
          )}
          <Button variant="primary" onClick={() => navigate('/')}>
            Dashboard
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <ScheduleSummary
        totalBlocks={calendarBlocks.length}
        deadlinesCovered={uniqueTasksCount}
        completedBlocks={completedCount}
        overlaps={computedOverlaps}
      />

      {/* 7-Day Calendar View */}
      <ScheduleCalendar
        blocks={calendarBlocks}
        timezone={userTimezone}
        onStartFocus={(block) => {
          navigate('/focus', { state: { studyBlock: block } });
        }}
      />
    </div>
  );
};
