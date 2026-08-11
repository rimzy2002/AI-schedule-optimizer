import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="text-2xl font-bold">Good morning 👋</h1>
        <p className="text-secondary">What should you work on next?</p>
      </header>

      <div className="dashboard-grid">
        <div className="main-column">
          <Card highlight className="action-card">
            <span className="action-label">NEXT ACTION</span>
            <h2 className="action-title">Calculus problem set</h2>
            <p className="action-due">Due tomorrow</p>
            <Button size="lg" className="action-btn">Start focus</Button>
          </Card>

          <section className="timeline-section">
            <h3 className="font-semibold text-lg mb-4">Today Timeline</h3>
            <div className="timeline-placeholder">
              <p className="text-secondary">No events scheduled for today.</p>
            </div>
          </section>
        </div>

        <div className="side-column">
          <Card className="quick-actions">
            <Button variant="secondary" fullWidth className="mb-2 text-left">Add course</Button>
            <Button variant="secondary" fullWidth className="text-left">Import syllabus</Button>
          </Card>

          <section className="deadlines-section mt-6">
            <h3 className="font-semibold text-lg mb-4">Upcoming deadlines</h3>
            <div className="deadline-placeholder">
              <p className="text-secondary text-sm">All caught up!</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
