import React, { useState } from 'react';
import { ParsedTask } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { apiClient } from '../../services/apiClient';

interface TaskReviewFormProps {
  task?: ParsedTask;
  courseId?: string;
  onSave: (task: ParsedTask) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const TaskReviewForm: React.FC<TaskReviewFormProps> = ({ task, courseId, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(task?.name || '');
  const [weight, setWeight] = useState(task?.weight !== undefined && task?.weight !== null ? task.weight.toString() : '');
  const [estimatedDuration, setEstimatedDuration] = useState(task?.estimated_duration ? task.estimated_duration.toString() : '');
  const [type, setType] = useState<ParsedTask['type']>(task?.type || 'assignment');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialIsDateOnly = task?.is_date_only ?? task?.isDateOnly ?? (task?.deadline ? /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) : false);

  const getInitialDate = () => {
    if (!task?.deadline) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) return task.deadline;
    try {
      const d = new Date(task.deadline);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getInitialTime = () => {
    if (!task?.deadline || initialIsDateOnly) return '';
    try {
      const d = new Date(task.deadline);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [datePart, setDatePart] = useState(getInitialDate());
  const [isDateOnly, setIsDateOnly] = useState(initialIsDateOnly);
  const [timePart, setTimePart] = useState(getInitialTime());
  const [deadlineChanged, setDeadlineChanged] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = weight.trim() === '' ? null : parseFloat(weight);
    const parsedDuration = estimatedDuration.trim() === '' ? null : parseInt(estimatedDuration, 10);

    let formattedDeadline: string | null;
    let finalIsDateOnly: boolean;

    if (!deadlineChanged && task?.deadline !== undefined) {
      // PRESERVE exact original deadline timestamp and date-only flag when deadline was not edited
      if (initialIsDateOnly && task.deadline && /^\d{4}-\d{2}-\d{2}T/.test(task.deadline)) {
        formattedDeadline = task.deadline.split('T')[0];
      } else {
        formattedDeadline = task.deadline;
      }
      finalIsDateOnly = initialIsDateOnly;
    } else if (datePart) {
      if (isDateOnly || !timePart) {
        formattedDeadline = datePart;
        finalIsDateOnly = true;
      } else {
        formattedDeadline = `${datePart}T${timePart}:00.000Z`;
        finalIsDateOnly = false;
      }
    } else {
      formattedDeadline = null;
      finalIsDateOnly = false;
    }

    let status: ParsedTask['status'] = 'Ready';
    if (!formattedDeadline) {
      status = 'CHECK DATE';
    }

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      let savedTaskData: any = null;

      if (task?.id) {
        // Server-backed draft task update
        savedTaskData = await apiClient.patch(`/tasks/${task.id}`, {
          title: name,
          type,
          weight: parsedWeight,
          estimated_duration: parsedDuration,
          deadline: formattedDeadline,
          is_date_only: finalIsDateOnly,
          description: task.description,
          recurring: task.recurring,
          needs_review: true,
          version: task.version,
          expected_version: task.version,
          expected_updated_at: task.updated_at,
        });
      } else if (courseId) {
        // Server-backed draft task creation
        savedTaskData = await apiClient.post('/tasks', {
          courseId,
          title: name,
          type,
          weight: parsedWeight,
          estimated_duration: parsedDuration,
          deadline: formattedDeadline,
          is_date_only: finalIsDateOnly,
          description: task?.description,
          recurring: task?.recurring || false,
          needs_review: true,
        });
      }

      setSaveStatus('saved');

      const resultingTask: ParsedTask = {
        id: savedTaskData?.id || task?.id || crypto.randomUUID(),
        name: savedTaskData?.title || name,
        type: savedTaskData?.type || type,
        weight: savedTaskData?.weight !== undefined ? savedTaskData.weight : parsedWeight,
        estimated_duration: savedTaskData?.estimated_duration !== undefined ? savedTaskData.estimated_duration : parsedDuration,
        description: savedTaskData?.description !== undefined ? savedTaskData.description : task?.description,
        recurring: savedTaskData?.recurring !== undefined ? savedTaskData.recurring : task?.recurring,
        syllabus_id: savedTaskData?.syllabus_id || task?.syllabus_id,
        deadline: savedTaskData?.deadline !== undefined ? savedTaskData.deadline : formattedDeadline,
        is_date_only: savedTaskData?.is_date_only !== undefined ? savedTaskData.is_date_only : finalIsDateOnly,
        status,
        version: savedTaskData?.version !== undefined ? savedTaskData.version : task?.version,
        updated_at: savedTaskData?.updated_at || task?.updated_at,
      };

      setTimeout(() => {
        onSave(resultingTask);
      }, 500);

    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save changes to the server. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!task?.id) {
      if (onDelete) onDelete();
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${name || 'this task'}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      if (onDelete) onDelete();
    } catch (err: any) {
      setIsDeleting(false);
      setErrorMessage(err.message || 'Failed to delete task from server.');
    }
  };

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded border border-error mb-2 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="text-xs font-bold underline ml-2"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <Input
          label="Task Name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Weight (%) (Optional)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g. 15 or leave empty"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            label="Est. Duration (mins)"
            type="number"
            min="15"
            step="15"
            placeholder="e.g. 60"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
          />
          <Input
            label="Deadline Date"
            type="date"
            value={datePart}
            onChange={(e) => {
              setDatePart(e.target.value);
              setDeadlineChanged(true);
            }}
          />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            id="isDateOnlyCheck"
            checked={isDateOnly}
            onChange={(e) => {
              setIsDateOnly(e.target.checked);
              setDeadlineChanged(true);
            }}
            className="rounded border-subtle"
          />
          <label htmlFor="isDateOnlyCheck" className="text-sm font-medium text-primary cursor-pointer select-none">
            Date only (no specific time)
          </label>
        </div>

        {!isDateOnly && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input
              label="Time (UTC)"
              type="time"
              value={timePart}
              onChange={(e) => {
                setTimePart(e.target.value);
                setDeadlineChanged(true);
              }}
            />
          </div>
        )}

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
        <div className="flex justify-between items-center mt-4">
          {onDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting || saveStatus === 'saving'}
            >
              {isDeleting ? 'Deleting...' : 'Delete task'}
            </Button>
          ) : <div />}
          <div className="flex items-center gap-3">
            {saveStatus === 'saved' && (
              <span className="text-sm font-semibold text-success">Saved ✓</span>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saveStatus === 'saving' || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveStatus === 'saving' || isDeleting}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
