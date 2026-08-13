import React, { useState } from 'react';
import { ParsedTask } from '../../types';
import { ParsedTaskCard } from './ParsedTaskCard';
import { TaskReviewForm } from './TaskReviewForm';

interface ParsedTaskListProps {
  tasks: ParsedTask[];
  onTasksChange: (tasks: ParsedTask[]) => void;
}

export const ParsedTaskList: React.FC<ParsedTaskListProps> = ({ tasks, onTasksChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleUpdateTask = (updatedTask: ParsedTask) => {
    onTasksChange(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingId(null);
  };

  const handleDeleteTask = (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
    setEditingId(null);
  };

  const handleAddTask = (newTask: ParsedTask) => {
    onTasksChange([...tasks, { ...newTask, status: 'NEW' }]);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id}>
          {editingId === task.id ? (
            <TaskReviewForm
              task={task}
              onSave={handleUpdateTask}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          ) : (
            <ParsedTaskCard
              task={task}
              onEdit={() => setEditingId(task.id)}
            />
          )}
        </div>
      ))}

      {isAdding ? (
        <TaskReviewForm
          onSave={handleAddTask}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Missing Task
        </button>
      )}
    </div>
  );
};
