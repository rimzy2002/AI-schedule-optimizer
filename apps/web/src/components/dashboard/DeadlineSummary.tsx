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
    <div className="space-y-3">
      {deadlines.map(task => {
        const due = new Date(task.deadline);
        const today = new Date();
        const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
        
        let dueText = '';
        let colorClass = 'text-gray-500 bg-gray-50';
        
        if (diffDays === 0) {
          dueText = 'Today';
          colorClass = 'text-red-600 bg-red-50';
        } else if (diffDays === 1) {
          dueText = 'Tomorrow';
          colorClass = 'text-orange-600 bg-orange-50';
        } else {
          dueText = `In ${diffDays} days`;
          colorClass = 'text-blue-600 bg-blue-50';
        }

        return (
          <div key={task.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
            <span className="font-medium text-gray-800 truncate pr-2">{task.title}</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${colorClass} whitespace-nowrap`}>
              {dueText}
            </span>
          </div>
        );
      })}
    </div>
  );
};
