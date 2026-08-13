import React from 'react';
import { ParsedTask } from '../../types';

interface ParsedTaskCardProps {
  task: ParsedTask;
  onEdit: () => void;
}

export const ParsedTaskCard: React.FC<ParsedTaskCardProps> = ({ task, onEdit }) => {
  const isError = task.status !== 'Ready' && task.status !== 'NEW';
  
  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  };

  return (
    <div className={`p-4 border rounded-lg shadow-sm flex items-center justify-between mb-2 ${isError ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{task.name}</h4>
        <div className="text-sm text-gray-500 mt-1 flex space-x-4">
          <span>{task.weight}%</span>
          <span>{formatDate(task.deadline)}</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          isError ? 'bg-red-100 text-red-800' : 
          task.status === 'NEW' ? 'bg-green-100 text-green-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {task.status}
        </span>
        <button 
          onClick={onEdit}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
      </div>
    </div>
  );
};
