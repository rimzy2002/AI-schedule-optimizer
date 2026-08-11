import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, LayoutDashboard, BookOpen, Clock, Settings, BrainCircuit } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrainCircuit className="brand-icon" />
        <span>AI Schedule</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Today
        </NavLink>
        <NavLink to="/schedule" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} /> Schedule
        </NavLink>
        <NavLink to="/review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} /> Courses
        </NavLink>
        <NavLink to="/focus" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Clock size={20} /> Focus
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} /> Settings
        </NavLink>
      </nav>
    </aside>
  );
};
