import React, { useState } from 'react';
import { ParsedTask } from '../../types';
import { ParsedTaskCard } from './ParsedTaskCard';
import { TaskReviewForm } from './TaskReviewForm';
import { Button } from '../ui/Button';

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
    <div className="flex flex-col gap-4">
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
        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => setIsAdding(true)}
          style={{ height: '56px', borderStyle: 'dashed', color: 'var(--text-muted)' }}
        >
          + Add missing task
        </Button>
      )}
    </div>
  );
};
