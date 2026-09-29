import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusTimer } from '../components/focus/FocusTimer';
import { TimerControls } from '../components/focus/TimerControls';
import { FocusTaskCard } from '../components/focus/FocusTaskCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../services/apiClient';

export const FocusPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialStudyBlock = location.state?.studyBlock;

  const [studyBlock, setStudyBlock] = useState<any>(initialStudyBlock || null);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'>('IDLE');
  const [isLoading, setIsLoading] = useState(true);

  // Restore active session on mount / refresh, or load next study block if available
  useEffect(() => {
    let isMounted = true;

    const initFocusState = async () => {
      try {
        const active = await apiClient.get('/focus/active');
        if (isMounted && active) {
          setSession(active);
          setStatus(active.status);
          if (active.studyBlock) {
            setStudyBlock(active.studyBlock);
          }
          return;
        }

        // If no active session and no passed block, load next study block
        if (isMounted && !initialStudyBlock) {
          const next = await apiClient.get('/focus/next-block');
          if (isMounted && next) {
            setStudyBlock(next);
          }
        }
      } catch (err) {
        console.error('Failed to initialize focus state', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initFocusState();
    return () => { isMounted = false; };
  }, [initialStudyBlock]);

  // Duration computation supporting both CalendarBlock and Database StudyBlock shapes
  const startIso = studyBlock?.start_time || studyBlock?.start;
  const endIso = studyBlock?.end_time || studyBlock?.end;
  const computedMins = (startIso && endIso)
    ? Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
    : 0;

  const blockDurationMins = session?.planned_minutes || (computedMins > 0 ? computedMins : 25);

  const displayTitle = 
    studyBlock?.taskTitle || 
    studyBlock?.task?.title || 
    studyBlock?.title || 
    'Study Session';

  const handleStart = async () => {
    try {
      const data = await apiClient.post('/focus/start', {
        studyBlockId: studyBlock?.id,
        taskId: studyBlock?.task_id || studyBlock?.taskId || studyBlock?.task?.id,
        plannedMinutes: blockDurationMins,
      });
      setSession(data);
      setStatus('ACTIVE');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    try {
      const data = await apiClient.patch(`/focus/${session.id}/pause`);
      setSession(data);
      setStatus('PAUSED');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const data = await apiClient.patch(`/focus/${session.id}/resume`);
      setSession(data);
      setStatus('ACTIVE');
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    try {
      await apiClient.patch(`/focus/${session.id}/complete`);
      setStatus('COMPLETED');
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
              title={displayTitle} 
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
