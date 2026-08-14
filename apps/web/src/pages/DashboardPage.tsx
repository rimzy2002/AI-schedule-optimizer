import React, { useEffect, useState } from 'react';
import { NextActionCard } from '../components/dashboard/NextActionCard';
import { TodayTimeline } from '../components/dashboard/TodayTimeline';
import { DeadlineSummary } from '../components/dashboard/DeadlineSummary';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/dashboard/today')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading your day...</div>;
  }

  return (
    <div className="dashboard">
      <header className="page-header mb-8">
        <h1 className="page-title mb-1">Good morning 👋</h1>
        <p className="page-subtitle">What should you work on next?</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main space-y-8">
          {data?.nextAction ? (
            <NextActionCard 
              action={data.nextAction} 
              onStart={() => navigate(`/focus`, { state: { studyBlock: data.nextAction } })}
            />
          ) : (
            <div className="bg-surface border border-subtle rounded-lg p-8 text-center">
              <h3 className="text-h3 text-primary">All done for now!</h3>
              <p className="text-secondary mt-2">Take a break, you've completed your tasks.</p>
            </div>
          )}

          <section>
            <h3 className="text-h3 text-primary mb-4">Today Timeline</h3>
            <TodayTimeline blocks={data?.todayBlocks || []} />
          </section>
        </div>

        <div className="dashboard-sidebar space-y-8">
          <section>
            <h3 className="text-h3 text-primary mb-4">Upcoming Deadlines</h3>
            <DeadlineSummary deadlines={data?.upcomingDeadlines || []} />
          </section>
          
          <div className="text-sm text-secondary bg-surface p-4 rounded-lg border border-subtle">
            <p>Missed sessions will be available for rescheduling.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
