import React from 'react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface TimelineBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const TodayTimeline: React.FC<{ blocks: TimelineBlock[] }> = ({ blocks }) => {
  const navigate = useNavigate();
  
  if (blocks.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-lg p-12 text-center flex flex-col items-center justify-center">
        <h3 className="text-h3 font-bold text-primary mb-2">No study sessions scheduled today.</h3>
        <p className="text-secondary mb-6">Your day is currently free.</p>
        <Button className="font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/schedule')}>
          Plan a session
        </Button>
      </div>
    );
  }

  const startHour = 8;
  const endHour = 20;
  const hourHeight = 60; // 60px per hour
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="bg-surface border border-subtle rounded-lg p-6 relative overflow-x-auto">
      <div className="relative min-w-[500px]" style={{ height: `${(endHour - startHour) * hourHeight}px` }}>
        {/* Hour markers and lines */}
        {hours.map((hour, index) => (
          <div 
            key={hour} 
            className="absolute left-0 right-0 flex items-start"
            style={{ top: `${index * hourHeight}px` }}
          >
            <div className="text-xs text-secondary w-12 shrink-0 -mt-2">
              {hour}:00
            </div>
            <div className="flex-1 border-t border-subtle ml-2"></div>
          </div>
        ))}

        {/* Timeline Events */}
        <div className="absolute left-14 right-4 top-0 bottom-0">
          {blocks.map((block) => {
            const start = new Date(block.start_time);
            const end = new Date(block.end_time);
            
            const startH = start.getHours();
            const startM = start.getMinutes();
            const endH = end.getHours();
            const endM = end.getMinutes();

            // Calculate position
            const top = ((startH - startHour) + (startM / 60)) * hourHeight;
            const height = (((endH - startH) * 60) + (endM - startM)) * (hourHeight / 60);

            // Filter out of bounds slightly just in case
            if (top < 0 && top + height <= 0) return null;

            const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const isCompleted = block.status === 'completed';

            return (
              <div 
                key={block.id} 
                className={`absolute left-0 right-0 p-3 rounded-md border ${isCompleted ? 'bg-surface-hover border-subtle text-muted' : 'bg-border-subtle border-border-strong text-primary'}`}
                style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
              >
                <div className="flex flex-col h-full justify-center overflow-hidden">
                  <span className={`font-semibold text-sm whitespace-nowrap truncate ${isCompleted ? 'line-through' : ''}`}>
                    {block.title}
                  </span>
                  <span className="text-xs mt-1 text-secondary">
                    {startStr}–{endStr} • Focus block
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
