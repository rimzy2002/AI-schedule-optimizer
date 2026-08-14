import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusTimer } from '../components/focus/FocusTimer';
import { TimerControls } from '../components/focus/TimerControls';
import { FocusTaskCard } from '../components/focus/FocusTaskCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

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
      const res = await fetch('/api/focus/start', {
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
      const res = await fetch(`/api/focus/${session.id}/pause`, { method: 'PATCH' });
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
      const res = await fetch(`/api/focus/${session.id}/resume`, { method: 'PATCH' });
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
      await fetch(`/api/focus/${session.id}/complete`, { method: 'PATCH' });
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
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-surface border border-subtle flex items-center justify-center text-accent">
          {/* Using a simple inline SVG for the focus icon as a placeholder */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-h2">No study block selected</h2>
          <p className="text-secondary text-body">
            Select a study session from your schedule to begin a focused work session.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/schedule')}>
          View Schedule
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      {status === 'COMPLETED' ? (
        <Card className="text-center p-12 bg-success-subtle border-success">
          <h2 className="text-h1 text-success mb-4">Session Complete!</h2>
          <p className="text-body text-secondary">Great job. Returning to dashboard...</p>
        </Card>
      ) : (
        <Card className="flex flex-col items-center p-10">
          <div className="w-full mb-10">
            <FocusTaskCard 
              title={studyBlock?.title || 'Ad-hoc Study Session'} 
            />
          </div>
          
          <FocusTimer
            plannedMinutes={blockDurationMins}
            status={status}
            startedAt={session?.start_time || null}
            pausedAt={session?.paused_at || null}
            accumulatedPause={session?.accumulated_pause || 0}
          />

          <div className="mt-10">
            <TimerControls 
              status={status}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onComplete={handleComplete}
            />
          </div>
        </Card>
      )}
    </div>
  );
};
