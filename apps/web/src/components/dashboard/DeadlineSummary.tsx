import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface DeadlineTask {
  id: string;
  title: string;
  deadline: string;
}

export const DeadlineSummary: React.FC<{ deadlines: DeadlineTask[] }> = ({ deadlines }) => {
  const navigate = useNavigate();

  if (deadlines.length === 0) {
    return (
      <Card className="bg-surface border-subtle border p-6 h-full flex flex-col items-start justify-between">
        <div>
          <h3 className="text-h3 font-bold text-primary mb-6">Upcoming deadlines</h3>
          <div className="mb-6">
            <h4 className="font-bold text-primary mb-1">You're all caught up! 🎉</h4>
            <p className="text-secondary text-sm">No upcoming deadlines.</p>
          </div>
        </div>
        <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/import')}>
          Add a course
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-subtle border p-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-h3 font-bold text-primary mb-6">Upcoming deadlines</h3>
        <div className="flex flex-col gap-6">
          {deadlines.map((task, index) => {
            const due = new Date(task.deadline);
            const today = new Date();
            const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
            
            let dueText = '';
            
            if (diffDays === 0) {
              dueText = 'Today';
            } else if (diffDays === 1) {
              dueText = 'Tomorrow';
            } else {
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              if (diffDays < 7) {
                dueText = days[due.getDay()];
              } else {
                dueText = `In ${diffDays} days`;
              }
            }

            return (
              <div key={task.id} className="flex flex-col">
                <span className="font-semibold text-primary text-sm mb-1">
                  {index + 1}. {task.title}
                </span>
                <span className="text-xs text-secondary">
                  {dueText} • Course
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
