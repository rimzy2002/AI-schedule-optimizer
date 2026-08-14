import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface NextActionCardProps {
  action: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    task?: {
      deadline?: string;
    };
  };
  onStart: () => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ action, onStart }) => {
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
    <Card className="bg-surface border-accent border-2 shadow-lg p-6">
      <span className="text-xs font-bold tracking-wider text-accent uppercase mb-2 block">
        NEXT ACTION
      </span>
      <h2 className="text-h2 text-primary mb-2">{action.title}</h2>
      
      <div className="flex gap-4 mb-6">
        {dueText && (
          <div className="flex items-center text-sm font-medium text-warning bg-warning-subtle px-2 py-1 rounded">
            {dueText}
          </div>
        )}
        <div className="flex items-center text-sm font-medium text-secondary bg-surface-hover px-2 py-1 rounded">
          {durationMins} min planned
        </div>
      </div>
      
      <Button size="lg" variant="primary" className="w-full sm:w-auto font-bold py-3 px-8" onClick={onStart}>
        Start focus
      </Button>
    </Card>
  );
};
