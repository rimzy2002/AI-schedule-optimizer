import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ParsedTask } from '../types';
import { ParsedTaskList } from '../components/syllabus/ParsedTaskList';

// Mock initial data if none provided via router state
const mockTasks: ParsedTask[] = [
  { id: '1', name: 'Midterm Exam', type: 'exam', weight: 25, deadline: '2023-10-14T00:00:00Z', status: 'Ready' },
  { id: '2', name: 'Research Essay', type: 'assignment', weight: 30, deadline: '2023-10-29T00:00:00Z', status: 'Ready' },
  { id: '3', name: 'Quiz 3', type: 'quiz', weight: 10, deadline: null, status: 'CHECK DATE' },
];

export const ReviewTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { syllabusId?: string, parsedTasks?: ParsedTask[] } | null;
  
  const syllabusId = state?.syllabusId || 'mock-syllabus-id';
  const [tasks, setTasks] = useState<ParsedTask[]>(state?.parsedTasks || mockTasks);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasErrors = tasks.some(t => t.status !== 'Ready' && t.status !== 'NEW');

  const handleConfirm = async () => {
    if (hasErrors) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/tasks/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabusId,
          tasks: tasks.map(t => ({
            name: t.name,
            type: t.type,
            weight: t.weight,
            deadline: t.deadline
          }))
        })
      });

      if (res.ok) {
        navigate('/schedule', { state: { syllabusId } });
      } else {
        alert('Failed to confirm tasks');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Extracted Tasks</h1>
        <p className="text-gray-600">
          The AI has proposed the following tasks. Please verify and edit them because the AI output is a proposal, not ground truth.
        </p>
      </div>

      <ParsedTaskList tasks={tasks} onTasksChange={setTasks} />

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={hasErrors || isSubmitting || tasks.length === 0}
          className={`px-6 py-3 rounded-md text-white font-medium ${
            hasErrors || tasks.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Confirming...' : 'Confirm Tasks & Generate Schedule'}
        </button>
      </div>
      {hasErrors && (
        <p className="text-red-500 text-sm text-right mt-2">
          Please resolve all errors before confirming.
        </p>
      )}
    </div>
  );
};
