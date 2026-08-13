import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScheduleSummary } from '../components/schedule/ScheduleSummary';
import { ScheduleCalendar } from '../components/schedule/ScheduleCalendar';

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
        const res = await fetch('http://localhost:4000/api/schedule/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syllabusId: syllabusId || 'mock-syllabus-id' })
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
      const res = await fetch('http://localhost:4000/api/schedule/accept', {
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
    return <div className="p-8 text-center text-gray-500">Generating your optimal schedule...</div>;
  }

  if (!scheduleData) {
    return <div className="p-8 text-center text-red-500">Failed to generate schedule.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Schedule Preview</h1>
        <button
          onClick={handleAccept}
          disabled={isAccepting}
          className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          {isAccepting ? 'Accepting...' : 'Accept Schedule'}
        </button>
      </div>

      <ScheduleSummary
        totalBlocks={scheduleData.metrics.totalBlocks}
        deadlinesCovered={scheduleData.metrics.deadlinesCovered}
        overlaps={0}
      />

      <ScheduleCalendar blocks={scheduleData.scheduled} />
      
      {scheduleData.unallocated?.length > 0 && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-bold mb-2">Warning: Could not allocate all study time</h3>
          <p className="text-yellow-700 text-sm">
            Some tasks require more study time than you have available before their deadline. 
            Consider adjusting your task weights or clearing your calendar.
          </p>
        </div>
      )}
    </div>
  );
};
