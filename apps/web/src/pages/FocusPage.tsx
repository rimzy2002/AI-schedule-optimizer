import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusTimer } from '../components/focus/FocusTimer';
import { TimerControls } from '../components/focus/TimerControls';
import { FocusTaskCard } from '../components/focus/FocusTaskCard';

export const FocusPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const studyBlock = location.state?.studyBlock;

  // Fallback if no study block
  const blockDurationMins = studyBlock 
    ? Math.round((new Date(studyBlock.end_time).getTime() - new Date(studyBlock.start_time).getTime()) / 60000) 
    : 25;

  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'>('IDLE');

  const handleStart = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyBlockId: studyBlock?.id,
          taskId: studyBlock?.task_id,
          plannedMinutes: blockDurationMins,
        })
      });
      const data = await res.json();
      setSession(data);
      setStatus('ACTIVE');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    try {
      const res = await fetch(`http://localhost:4000/api/focus/${session.id}/pause`, { method: 'PATCH' });
      const data = await res.json();
      setSession(data);
      setStatus('PAUSED');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const res = await fetch(`http://localhost:4000/api/focus/${session.id}/resume`, { method: 'PATCH' });
      const data = await res.json();
      setSession(data);
      setStatus('ACTIVE');
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    try {
      await fetch(`http://localhost:4000/api/focus/${session.id}/complete`, { method: 'PATCH' });
      setStatus('COMPLETED');
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  if (!studyBlock && status === 'IDLE') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">No study block selected</h2>
        <button className="mt-4 text-blue-500 underline" onClick={() => navigate('/')}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {status === 'COMPLETED' ? (
        <div className="text-center p-12 bg-green-50 border border-green-200 rounded-2xl">
          <h2 className="text-3xl font-bold text-green-700 mb-4">Session Complete!</h2>
          <p className="text-green-600">Great job. Returning to dashboard...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <FocusTaskCard 
            title={studyBlock?.title || 'Ad-hoc Study Session'} 
          />
          
          <FocusTimer
            plannedMinutes={blockDurationMins}
            status={status}
            startedAt={session?.start_time || null}
            pausedAt={session?.paused_at || null}
            accumulatedPause={session?.accumulated_pause || 0}
          />

          <TimerControls 
            status={status}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
};
