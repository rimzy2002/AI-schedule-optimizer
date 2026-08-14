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
    <div className="bg-surface border border-strong p-3 rounded-md shadow-sm">
      <p className="font-semibold text-primary">{title}</p>
      <p className="text-xs text-secondary mt-1">
        {formatTime(start)} - {formatTime(end)}
      </p>
    </div>
  );
};
