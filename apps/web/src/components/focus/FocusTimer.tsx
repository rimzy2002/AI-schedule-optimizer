import React, { useEffect, useState } from 'react';

interface FocusTimerProps {
  plannedMinutes: number;
  status: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedPause: number;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  plannedMinutes, status, startedAt, pausedAt, accumulatedPause
}) => {
  const [remaining, setRemaining] = useState(plannedMinutes * 60);

  useEffect(() => {
    if (status === 'IDLE') {
      setRemaining(plannedMinutes * 60);
      return;
    }

    if (status === 'COMPLETED') {
      setRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      if (!startedAt) return;
      
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const durationSeconds = plannedMinutes * 60;
      
      let currentPauseSeconds = 0;
      if (status === 'PAUSED' && pausedAt) {
        currentPauseSeconds = Math.floor((now - new Date(pausedAt).getTime()) / 1000);
      }
      
      const totalPause = accumulatedPause + currentPauseSeconds;
      const elapsedSeconds = Math.floor((now - start) / 1000) - totalPause;
      
      const newRemaining = Math.max(0, durationSeconds - elapsedSeconds);
      setRemaining(newRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt, pausedAt, accumulatedPause, plannedMinutes]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center justify-center my-12">
      <div 
        className="font-black tabular-nums" 
        style={{ 
          fontSize: '5rem', 
          lineHeight: '1', 
          color: status === 'PAUSED' ? 'var(--text-muted)' : 'var(--text-primary)' 
        }}
      >
        {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </div>
      {status === 'PAUSED' && (
        <p className="text-warning font-bold mt-4 uppercase tracking-widest">Paused</p>
      )}
    </div>
  );
};
