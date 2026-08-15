import React from 'react';
import { ParsedTask } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ParsedTaskCardProps {
  task: ParsedTask;
  onEdit: () => void;
}

export const ParsedTaskCard: React.FC<ParsedTaskCardProps> = ({ task, onEdit }) => {
  const isError = task.status !== 'Ready' && task.status !== 'NEW';
  
  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', timeZone: 'UTC' });
  };

  const getBadgeVariant = (status: string) => {
    if (status === 'Ready') return 'success';
    if (status === 'NEW') return 'success';
    if (status === 'CHECK DATE' || status === 'Needs attention') return 'warning';
    return 'error';
  };

  return (
    <Card className={`mb-2 flex items-center justify-between ${isError ? 'card-highlight' : ''}`}>
      <div className="flex-1">
        <h4 className="text-body font-semibold text-primary">{task.name}</h4>
        <div className="text-sm text-secondary mt-2 flex gap-6">
          <span>{task.weight}%</span>
          <span>{formatDate(task.deadline)}</span>
          <span className="capitalize" style={{ color: 'var(--primary)' }}>{task.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant={getBadgeVariant(task.status)}>
          {task.status}
        </Badge>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </Card>
  );
};
