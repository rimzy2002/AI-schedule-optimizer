import React, { useState } from 'react';
import { ParsedTask } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface TaskReviewFormProps {
  task?: ParsedTask;
  onSave: (task: ParsedTask) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const TaskReviewForm: React.FC<TaskReviewFormProps> = ({ task, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(task?.name || '');
  const [weight, setWeight] = useState(task?.weight?.toString() || '');
  const [deadline, setDeadline] = useState(task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
  const [type, setType] = useState<ParsedTask['type']>(task?.type || 'assignment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseFloat(weight) || 0;
    let status: ParsedTask['status'] = 'Ready';
    if (!deadline) status = 'CHECK DATE';
    else if (parsedWeight === 0) status = 'MISSING WEIGHT';

    onSave({
      id: task?.id || crypto.randomUUID(),
      name,
      type,
      weight: parsedWeight,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status,
    });
  };

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Task Name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-4">
          <Input
            label="Weight (%)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as ParsedTask['type'])}
          options={[
            { value: 'assignment', label: 'Assignment' },
            { value: 'exam', label: 'Exam' },
            { value: 'quiz', label: 'Quiz' },
            { value: 'project', label: 'Project' },
            { value: 'reading', label: 'Reading' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <div className="flex justify-between mt-4">
          {onDelete ? (
            <Button type="button" variant="danger" onClick={onDelete}>
              Delete extraction
            </Button>
          ) : <div></div>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
