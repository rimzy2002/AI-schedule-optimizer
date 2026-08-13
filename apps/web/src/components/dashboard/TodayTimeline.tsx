import React from 'react';

interface TimelineBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const TodayTimeline: React.FC<{ blocks: TimelineBlock[] }> = ({ blocks }) => {
  if (blocks.length === 0) {
    return <p className="text-gray-500">No events scheduled for today.</p>;
  }

  return (
    <div className="space-y-4 border-l-2 border-gray-200 ml-3 pl-4">
      {blocks.map((block) => {
        const start = new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isCompleted = block.status === 'completed';
        
        return (
          <div key={block.id} className="relative">
            <div className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 ${
              isCompleted ? 'bg-green-500 border-green-500' : 'bg-white border-blue-500'
            }`} />
            <div className={`p-3 rounded-md ${isCompleted ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-gray-800'}`}>
              <h4 className={`font-semibold ${isCompleted ? 'line-through' : ''}`}>{block.title}</h4>
              <p className="text-sm mt-1">{start} - {end}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
