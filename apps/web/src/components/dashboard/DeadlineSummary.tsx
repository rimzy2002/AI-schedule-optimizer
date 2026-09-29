import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface DeadlineTask {
  id: string;
  title: string;
  deadline: string;
  is_date_only?: boolean;
  course?: {
    title?: string;
  };
}

export const DeadlineSummary: React.FC<{ deadlines: DeadlineTask[] }> = ({ deadlines }) => {
  const navigate = useNavigate();

  const parseDeadline = (deadlineStr: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
      const [y, m, d] = deadlineStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(deadlineStr);
  };

  if (deadlines.length === 0) {
    return (
      <Card className="bg-surface border-subtle border p-6 h-full flex flex-col items-start justify-between">
        <div>
          <h3 className="text-h3 font-bold text-primary mb-6">Upcoming deadlines</h3>
          <div className="mb-6">
            <h4 className="font-bold text-primary mb-1">You're all caught up! 🎉</h4>
            <p className="text-secondary text-sm">No upcoming deadlines within the next 7 days.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/courses')}>
            View Courses
          </Button>
          <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/import')}>
            Add Course
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-h3 font-bold text-primary">Upcoming deadlines</h3>
          <span className="text-xs text-secondary">Next 7 days</span>
        </div>
        <div className="flex flex-col gap-5">
          {deadlines.map((task, index) => {
            const due = parseDeadline(task.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
            const diffDays = Math.round((dueDayStart.getTime() - today.getTime()) / 86400000);
            
            const dueText = (() => {
              if (diffDays < 0) return 'Overdue';
              if (diffDays === 0) return 'Today';
              if (diffDays === 1) return 'Tomorrow';
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              if (diffDays < 7) return days[due.getDay()];
              return `In ${diffDays} days`;
            })();

            const isTimed = !task.is_date_only && task.deadline.includes('T');
            const timeStr = isTimed ? due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={task.id} className="flex flex-col pb-3 border-b border-subtle last:border-b-0 last:pb-0">
                <span className="font-semibold text-primary text-sm mb-1">
                  {index + 1}. {task.title}
                </span>
                <span className="text-xs text-secondary flex items-center gap-2">
                  <span className={diffDays <= 1 ? 'font-semibold text-amber-600' : ''}>
                    {dueText} {timeStr ? `at ${timeStr}` : ''}
                  </span>
                  <span>•</span>
                  <span>{task.course?.title || 'Course'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-8">
        <button 
          onClick={() => navigate('/schedule')}
          className="text-sm font-semibold text-primary hover:text-accent-blue transition-colors flex items-center"
        >
          View full schedule <span className="ml-1">→</span>
        </button>
      </div>
    </Card>
  );
};
