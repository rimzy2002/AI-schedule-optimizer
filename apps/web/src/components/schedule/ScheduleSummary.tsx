import React from 'react';
import { Card } from '../ui/Card';

interface ScheduleSummaryProps {
  totalBlocks: number;
  deadlinesCovered: number;
  overlaps?: number;
}

export const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ totalBlocks, deadlinesCovered, overlaps = 0 }) => {
  return (
    <Card className="mb-6">
      <h2 className="text-h2 text-primary mb-4">Your study plan is ready</h2>
      <div className="flex gap-8">
        <div>
          <p className="text-3xl font-bold text-accent">{totalBlocks}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">study blocks created</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-accent">{deadlinesCovered}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">deadlines covered</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-accent">{overlaps}</p>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">overlaps</p>
        </div>
      </div>
    </Card>
  );
};
