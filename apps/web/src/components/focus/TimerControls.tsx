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
    <div className="flex justify-center gap-4 mt-8">
      {status === 'IDLE' && (
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onStart}>
          Start Session
        </Button>
      )}
      
      {status === 'ACTIVE' && (
        <>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={onPause}>
            Pause
          </Button>
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={onComplete}>
            Complete
          </Button>
        </>
      )}
      
      {status === 'PAUSED' && (
        <>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onResume}>
            Resume
          </Button>
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={onComplete}>
            Complete
          </Button>
        </>
      )}
    </div>
  );
};
