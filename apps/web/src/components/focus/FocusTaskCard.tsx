import React from 'react';
import { Card } from '../ui/Card';

interface FocusTaskCardProps {
  title: string;
  dueText?: string;
}

export const FocusTaskCard: React.FC<FocusTaskCardProps> = ({ title, dueText }) => {
  return (
    <Card className="text-center bg-gray-50 border border-gray-200 shadow-sm p-4 mb-6">
      <span className="text-xs font-bold tracking-wider text-gray-500 uppercase block mb-1">
        CURRENTLY FOCUSING ON
      </span>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {dueText && (
        <p className="text-sm text-gray-500 mt-1">{dueText}</p>
      )}
    </Card>
  );
};
