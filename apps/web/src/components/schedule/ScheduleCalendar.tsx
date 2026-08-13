import React from 'react';
import { StudyBlock } from './StudyBlock';

interface ScheduleCalendarProps {
  blocks: { taskId: string; taskTitle: string; start: string; end: string; }[];
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ blocks }) => {
  // Group blocks by day
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const groupedBlocks: Record<string, typeof blocks> = {};

  blocks.forEach(block => {
    const d = new Date(block.start);
    const dayName = days[d.getDay()];
    if (!groupedBlocks[dayName]) {
      groupedBlocks[dayName] = [];
    }
    groupedBlocks[dayName].push(block);
  });

  const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
        <div key={day} className="bg-white border rounded-lg p-4 min-h-[300px]">
          <h3 className="font-bold text-gray-700 text-center mb-4 pb-2 border-b">{day}</h3>
          <div className="space-y-2">
            {groupedBlocks[day]?.length > 0 ? (
              groupedBlocks[day].map((block, i) => (
                <StudyBlock 
                  key={i} 
                  title={block.taskTitle} 
                  start={block.start} 
                  end={block.end} 
                />
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center pt-4">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
