import React from 'react';

interface StudyBlockProps {
  title: string;
  start: string;
  end: string;
}

export const StudyBlock: React.FC<StudyBlockProps> = ({ title, start, end }) => {
  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-indigo-100 border border-indigo-200 p-3 rounded-md shadow-sm mb-2">
      <p className="font-semibold text-indigo-900">{title}</p>
      <p className="text-sm text-indigo-700 mt-1">
        {formatTime(start)} - {formatTime(end)}
      </p>
    </div>
  );
};
