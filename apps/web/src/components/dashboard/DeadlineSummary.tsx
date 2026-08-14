import React from 'react';

interface DeadlineTask {
  id: string;
  title: string;
  deadline: string;
}

export const DeadlineSummary: React.FC<{ deadlines: DeadlineTask[] }> = ({ deadlines }) => {
  if (deadlines.length === 0) {
    return <p className="text-gray-500">All caught up! No upcoming deadlines.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {deadlines.map(task => {
        const due = new Date(task.deadline);
        const today = new Date();
        const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
        
        let dueText = '';
        let colorClass = 'text-muted bg-surface-hover';
        
        if (diffDays === 0) {
          dueText = 'Today';
          colorClass = 'text-error bg-error-subtle';
        } else if (diffDays === 1) {
          dueText = 'Tomorrow';
          colorClass = 'text-warning bg-warning-subtle';
        } else {
          dueText = `In ${diffDays} days`;
          colorClass = 'text-accent bg-accent-subtle';
        }

        return (
          <div key={task.id} className="flex justify-between items-center p-3 bg-surface border border-subtle rounded-lg">
            <span className="font-medium text-primary truncate pr-2">{task.title}</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${colorClass} whitespace-nowrap`}>
              {dueText}
            </span>
          </div>
        );
      })}
    </div>
  );
};
