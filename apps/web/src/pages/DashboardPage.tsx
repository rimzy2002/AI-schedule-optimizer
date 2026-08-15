import React, { useEffect, useState } from 'react';
import { NextActionCard } from '../components/dashboard/NextActionCard';
import { SyllabusImportCard } from '../components/dashboard/SyllabusImportCard';
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
        // On error, we still want to show the dashboard empty states rather than crashing
        setData({ nextAction: null, todayBlocks: [], upcomingDeadlines: [] });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-secondary">
        Loading your day...
      </div>
    );
  }

  // Greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';

  return (
    <div className="dashboard-container">
      <header className="mb-8">
        <h1 className="text-h3 font-medium text-secondary mb-1">{greeting} 👋</h1>
        <h2 className="text-4xl font-bold text-primary">What should you work on next?</h2>
      </header>

      <div className="dashboard-top-grid mb-12">
        <NextActionCard 
          action={data?.nextAction} 
          onStart={() => {
            if (data?.nextAction) {
              navigate(`/focus`, { state: { studyBlock: data.nextAction } });
            }
          }}
        />
        <SyllabusImportCard />
      </div>

      <section>
        <h2 className="text-2xl font-bold text-primary mb-6">Today</h2>
        <div className="dashboard-bottom-grid">
          <TodayTimeline blocks={data?.todayBlocks || []} />
          <DeadlineSummary deadlines={data?.upcomingDeadlines || []} />
        </div>
      </section>
    </div>
  );
};
