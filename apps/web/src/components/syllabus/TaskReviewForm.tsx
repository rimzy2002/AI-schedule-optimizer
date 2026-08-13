import React, { useState } from 'react';
import { ParsedTask } from '../../types';

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
    onSave({
      id: task?.id || crypto.randomUUID(),
      name,
      type,
      weight: parseFloat(weight) || 0,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status: 'Ready', // reset status on edit
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 shadow-sm mt-2 mb-2">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Task Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Weight (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ParsedTask['type'])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="assignment">Assignment</option>
            <option value="exam">Exam</option>
            <option value="quiz">Quiz</option>
            <option value="project">Project</option>
            <option value="reading">Reading</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex justify-between pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Delete extraction
            </button>
          ) : <div></div>}
          <div className="space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
