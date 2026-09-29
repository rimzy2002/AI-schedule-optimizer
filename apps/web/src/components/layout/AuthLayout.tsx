import React from 'react';
import { BrainCircuit, BookOpen, Clock, Target, CalendarDays } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="auth-page">
      <main className="auth-shell">
        {/* Left Panel: Branded Introduction (Desktop) */}
        <section className="auth-intro-desktop" aria-labelledby="auth-desktop-heading">
          <div className="auth-brand">
            <div className="auth-brand-icon-wrapper" aria-hidden="true">
              <BrainCircuit size={26} />
            </div>
            <span className="auth-brand-name">AI Schedule Optimizer</span>
          </div>

          <h1 id="auth-desktop-heading" className="auth-headline">
            Turn deadlines into a clear study plan.
          </h1>
          <p className="auth-supporting-text">
            Organize coursework, plan study sessions and stay focused.
          </p>

          <div className="auth-features" role="list">
            <div className="auth-feature-item" role="listitem">
              <div className="auth-feature-icon-wrapper" aria-hidden="true">
                <BookOpen size={18} />
              </div>
              <span className="auth-feature-label">Organize courses and deadlines</span>
            </div>

            <div className="auth-feature-item" role="listitem">
              <div className="auth-feature-icon-wrapper" aria-hidden="true">
                <Clock size={18} />
              </div>
              <span className="auth-feature-label">Plan around your study hours</span>
            </div>

            <div className="auth-feature-item" role="listitem">
              <div className="auth-feature-icon-wrapper" aria-hidden="true">
                <Target size={18} />
              </div>
              <span className="auth-feature-label">Track focused study sessions</span>
            </div>
          </div>

          {/* Illustrative Schedule Snippet (Optional presentation enhancement) */}
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-header">
              <div className="auth-preview-title">
                <CalendarDays size={15} />
                <span>Today's Study Plan</span>
              </div>
              <span className="auth-preview-status">Active</span>
            </div>
            <div className="auth-preview-body">
              <div className="auth-preview-item">
                <div className="auth-preview-time">09:00 - 10:30</div>
                <div className="auth-preview-info">
                  <span className="auth-preview-course">Algorithms & Data Structures</span>
                  <span className="auth-preview-task">Problem Set 3 · Focus Block (45m)</span>
                </div>
              </div>
              <div className="auth-preview-item accent-cyan">
                <div className="auth-preview-time">14:00 - 15:15</div>
                <div className="auth-preview-info">
                  <span className="auth-preview-course">Operating Systems</span>
                  <span className="auth-preview-task">Concurrency Lab · Review (45m)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Authentication Form Surface */}
        <section className="auth-form-column" aria-label="Authentication form">
          {/* Mobile compact header */}
          <div className="auth-intro-mobile">
            <div className="auth-brand">
              <div className="auth-brand-icon-wrapper" aria-hidden="true">
                <BrainCircuit size={24} />
              </div>
              <span className="auth-brand-name">AI Schedule Optimizer</span>
            </div>
            <h1 className="auth-headline">Turn deadlines into a clear study plan.</h1>
            <p className="auth-supporting-text">Organize coursework, plan study sessions and stay focused.</p>
          </div>

          <div className="auth-card">
            <header className="auth-header">
              <h2 className="auth-title">{title}</h2>
              <p className="auth-subtitle">{subtitle}</p>
            </header>

            {children}
          </div>
        </section>
      </main>
    </div>
  );
};
