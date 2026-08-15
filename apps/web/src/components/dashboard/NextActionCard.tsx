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
  onStart: () => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ action, onStart }) => {
  const navigate = useNavigate();

  if (!action) {
    return (
      <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between items-start">
        <div className="mb-6">
          <span className="text-xs font-bold tracking-wider text-muted uppercase mb-2 block">
            NEXT ACTION
          </span>
          <h2 className="text-h2 font-bold text-primary mb-2">You're all caught up! 🎉</h2>
          <p className="text-secondary text-sm">
            No urgent tasks right now. Add a course or schedule a study session to get started.
          </p>
        </div>
        <Button className="w-full sm:w-auto font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/import')}>
          Add course
        </Button>
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
      
      <Button className="w-full sm:w-auto font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={onStart}>
        Start focus
      </Button>
    </Card>
  );
};
