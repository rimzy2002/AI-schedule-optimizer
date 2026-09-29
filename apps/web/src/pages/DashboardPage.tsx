import React, { useEffect, useState } from 'react';
import { NextActionCard } from '../components/dashboard/NextActionCard';
import { SyllabusImportCard } from '../components/dashboard/SyllabusImportCard';
import { TodayTimeline } from '../components/dashboard/TodayTimeline';
import { DeadlineSummary } from '../components/dashboard/DeadlineSummary';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/dashboard/today')
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
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
          nextUpcomingBlock={data?.nextUpcomingBlock}
          totalCoursesCount={data?.totalCoursesCount || 0}
          onStart={(block) => {
            const target = block || data?.nextAction;
            if (target) {
              navigate('/focus', { state: { studyBlock: target } });
            }
          }}
        />
        <SyllabusImportCard />
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-primary">Today</h2>
            <span className="text-xs bg-bg-secondary px-2.5 py-1 rounded-full text-secondary font-medium border border-border-color">
              Today's Scope ({data?.timezone || 'Local'})
            </span>
          </div>
          <button 
            onClick={() => navigate('/schedule')} 
            className="text-sm font-semibold text-primary hover:text-accent-blue transition-colors"
          >
            View Full 7-Day Schedule →
          </button>
        </div>
        <div className="dashboard-bottom-grid">
          <TodayTimeline 
            blocks={data?.todayBlocks || []} 
            hasUpcoming={Boolean(data?.nextUpcomingBlock || (data?.totalStudyBlocksCount && data.totalStudyBlocksCount > 0))}
          />
          <DeadlineSummary deadlines={data?.upcomingDeadlines || []} />
        </div>
      </section>
    </div>
  );
};
