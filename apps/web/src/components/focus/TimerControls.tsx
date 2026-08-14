import React from 'react';
import { Button } from '../ui/Button';

interface TimerControlsProps {
  status: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  status, onStart, onPause, onResume, onComplete
}) => {
  return (
    <div className="flex justify-center gap-4">
      {status === 'IDLE' && (
        <Button size="lg" variant="primary" onClick={onStart}>
          Start Session
        </Button>
      )}
      
      {status === 'ACTIVE' && (
        <>
          <Button size="lg" variant="secondary" onClick={onPause}>
            Pause
          </Button>
          <Button size="lg" variant="primary" onClick={onComplete}>
            Complete
          </Button>
        </>
      )}
      
      {status === 'PAUSED' && (
        <>
          <Button size="lg" variant="primary" onClick={onResume}>
            Resume
          </Button>
          <Button size="lg" variant="secondary" onClick={onComplete}>
            Complete
          </Button>
        </>
      )}
    </div>
  );
};
