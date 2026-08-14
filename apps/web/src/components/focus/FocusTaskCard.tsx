import React from 'react';
import { Card } from '../ui/Card';

interface FocusTaskCardProps {
  title: string;
  dueText?: string;
}

export const FocusTaskCard: React.FC<FocusTaskCardProps> = ({ title, dueText }) => {
  return (
    <div className="text-center w-full">
      <span className="text-xs font-bold tracking-wider text-muted uppercase block mb-2">
        CURRENTLY FOCUSING ON
      </span>
      <h2 className="text-h2 text-primary">{title}</h2>
      {dueText && (
        <p className="text-sm text-secondary mt-1">{dueText}</p>
      )}
    </div>
  );
};
