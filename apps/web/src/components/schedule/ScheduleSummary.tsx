import React from 'react';
import { Card } from '../ui/Card';

interface ScheduleSummaryProps {
  totalBlocks: number;
  deadlinesCovered: number;
  overlaps: number;
  completedBlocks?: number;
}

export const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ 
  totalBlocks, 
  deadlinesCovered, 
  overlaps,
  completedBlocks = 0
}) => {
  return (
    <Card className="mb-6 p-6">
      <h2 className="text-h2 text-primary mb-4">Your study plan is ready</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div>
          <p className="text-3xl font-extrabold text-primary mb-1">{totalBlocks}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">study blocks</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-primary mb-1">{deadlinesCovered}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">deadlines covered</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-primary mb-1">{completedBlocks}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">completed</p>
        </div>
        <div>
          <p className={`text-3xl font-extrabold mb-1 ${overlaps > 0 ? 'text-warning' : 'text-primary'}`}>
            {overlaps}
          </p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">overlaps</p>
        </div>
      </div>
    </Card>
  );
};
