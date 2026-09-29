import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface NextActionCardProps {
  action: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    task?: {
      deadline?: string;
    };
  } | null;
  nextUpcomingBlock?: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    task?: {
      deadline?: string;
    };
    course?: {
      title?: string;
    };
  } | null;
  totalCoursesCount?: number;
  onStart: (block?: any) => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ 
  action, 
  nextUpcomingBlock, 
  totalCoursesCount = 0, 
  onStart 
}) => {
  const navigate = useNavigate();

  if (!action) {
    if (nextUpcomingBlock) {
      const nextStart = new Date(nextUpcomingBlock.start_time);
      const nextEnd = new Date(nextUpcomingBlock.end_time);
      const durationMins = Math.round((nextEnd.getTime() - nextStart.getTime()) / 60000);
      const dateStr = nextStart.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = nextStart.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return (
        <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between items-start">
          <div className="mb-6">
            <span className="text-xs font-bold tracking-wider text-muted uppercase mb-2 block">
              NEXT UPCOMING SESSION
            </span>
            <h2 className="text-h2 font-bold text-primary mb-2">{nextUpcomingBlock.title}</h2>
            <div className="flex flex-wrap gap-2 text-sm text-secondary mb-3">
              <span>{dateStr} at {timeStr}</span>
              <span>•</span>
              <span>{durationMins} min planned</span>
              {nextUpcomingBlock.course?.title && (
                <>
                  <span>•</span>
                  <span className="font-medium text-primary">{nextUpcomingBlock.course.title}</span>
                </>
              )}
            </div>
            <p className="text-secondary text-xs">
              No sessions scheduled today, but your upcoming study plan is active.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Button 
              className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" 
              onClick={() => onStart(nextUpcomingBlock)}
            >
              Start Early Focus
            </Button>
            <Button 
              className="font-bold py-2 px-4 bg-surface border border-subtle hover:bg-surface-hover text-secondary rounded-md" 
              onClick={() => navigate('/schedule')}
            >
              View Schedule
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between items-start">
        <div className="mb-6">
          <span className="text-xs font-bold tracking-wider text-muted uppercase mb-2 block">
            NEXT ACTION
          </span>
          <h2 className="text-h2 font-bold text-primary mb-2">You're all caught up! 🎉</h2>
          <p className="text-secondary text-sm">
            {totalCoursesCount > 0 
              ? `You have ${totalCoursesCount} saved course(s). Review course tasks to generate a schedule, or import a new syllabus.`
              : 'No urgent tasks right now. Add a course or schedule a study session to get started.'}
          </p>
        </div>
        <div className="flex gap-3">
          {totalCoursesCount > 0 && (
            <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/courses')}>
              View Courses
            </Button>
          )}
          <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/import')}>
            Add Course
          </Button>
        </div>
      </Card>
    );
  }

  const start = new Date(action.start_time);
  const end = new Date(action.end_time);
  const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
  
  let dueText = '';
  if (action.task?.deadline) {
    const due = new Date(action.task.deadline);
    const today = new Date();
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) dueText = 'Due today';
    else if (diffDays === 1) dueText = 'Due tomorrow';
    else dueText = `Due in ${diffDays} days`;
  }

  return (
    <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between items-start">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-wider text-muted uppercase mb-2 block">
          NEXT ACTION
        </span>
        <h2 className="text-h2 font-bold text-primary mb-2">{action.title}</h2>
        
        <div className="flex flex-wrap gap-2 text-sm text-secondary">
          {dueText && <span>{dueText}</span>}
          {dueText && <span>•</span>}
          <span>{durationMins} min planned</span>
        </div>
      </div>
      
      <Button className="w-full sm:w-auto font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => onStart(action)}>
        Start focus
      </Button>
    </Card>
  );
};
