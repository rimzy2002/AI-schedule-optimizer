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
    fetch('http://localhost:4000/api/dashboard/today')
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
      <header className="dashboard-header mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Good morning 👋</h1>
        <p className="text-gray-500">What should you work on next?</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {data?.nextAction ? (
            <NextActionCard 
              action={data.nextAction} 
              onStart={() => navigate(`/focus`, { state: { studyBlock: data.nextAction } })}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <h3 className="text-lg font-bold text-gray-700">All done for now!</h3>
              <p className="text-gray-500 mt-2">Take a break, you've completed your tasks.</p>
            </div>
          )}

          <section>
            <h3 className="font-bold text-xl mb-4">Today Timeline</h3>
            <TodayTimeline blocks={data?.todayBlocks || []} />
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="font-bold text-xl mb-4">Upcoming Deadlines</h3>
            <DeadlineSummary deadlines={data?.upcomingDeadlines || []} />
          </section>
          
          <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
            <p>Missed sessions will be available for rescheduling.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
