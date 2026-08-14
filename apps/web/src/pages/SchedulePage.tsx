import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScheduleSummary } from '../components/schedule/ScheduleSummary';
import { ScheduleCalendar } from '../components/schedule/ScheduleCalendar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface ScheduleData {
  scheduled: { taskId: string; taskTitle: string; start: string; end: string; }[];
  unallocated: any[];
  metrics: {
    totalBlocks: number;
    deadlinesCovered: number;
  }
}

export const SchedulePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { syllabusId?: string } | null;
  const syllabusId = state?.syllabusId;

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    // If no syllabusId, maybe fetch a default or show error.
    const fetchPreview = async () => {
      try {
        const res = await fetch('/api/schedule/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syllabusId: syllabusId || '00000000-0000-0000-0000-000000000000' })
        });
        if (res.ok) {
          const data = await res.json();
          setScheduleData(data);
        } else {
          console.error('Failed to fetch preview');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreview();
  }, [syllabusId]);

  const handleAccept = async () => {
    if (!scheduleData) return;
    setIsAccepting(true);
    try {
      const res = await fetch('/api/schedule/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: scheduleData.scheduled })
      });
      if (res.ok) {
        navigate('/'); // Go back to dashboard on success
      } else {
        alert('Failed to accept schedule');
      }
    } catch (e) {
      console.error(e);
      alert('Error accepting schedule');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Generating your optimal schedule...</div>;
  }

  if (!scheduleData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="flex flex-col items-center justify-center p-12 text-center border-error bg-error-subtle">
          <div className="text-error text-3xl mb-4">⚠</div>
          <h2 className="text-h2 text-error mb-2">Unable to generate your schedule</h2>
          <p className="text-body text-secondary mb-6">Review your coursework and try again.</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/review')}>Review Tasks</Button>
            <Button variant="primary" onClick={() => navigate('/import')}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="page-title mb-0">Schedule</h1>
        <Button
          variant="primary"
          onClick={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Schedule'}
        </Button>
      </div>

      <ScheduleSummary
        totalBlocks={scheduleData.metrics.totalBlocks}
        deadlinesCovered={scheduleData.metrics.deadlinesCovered}
        overlaps={0}
      />

      <ScheduleCalendar blocks={scheduleData.scheduled} />
      
      {scheduleData.unallocated?.length > 0 && (
        <Card className="mt-8 border-warning bg-warning-subtle">
          <h3 className="text-h3 text-warning mb-2">Warning: Could not allocate all study time</h3>
          <p className="text-sm text-secondary">
            Some tasks require more study time than you have available before their deadline. 
            Consider adjusting your task weights or clearing your calendar.
          </p>
        </Card>
      )}
    </div>
  );
};
