import React from 'react';

interface ScheduleSummaryProps {
  totalBlocks: number;
  deadlinesCovered: number;
  overlaps?: number;
}

export const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ totalBlocks, deadlinesCovered, overlaps = 0 }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-blue-900 mb-4">Your study plan is ready</h2>
      <div className="flex space-x-8">
        <div>
          <p className="text-3xl font-bold text-blue-700">{totalBlocks}</p>
          <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">study blocks created</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-blue-700">{deadlinesCovered}</p>
          <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">deadlines covered</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-blue-700">{overlaps}</p>
          <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">overlaps</p>
        </div>
      </div>
    </div>
  );
};
