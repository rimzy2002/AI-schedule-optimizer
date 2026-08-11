import React from 'react';
import { User, Bell } from 'lucide-react';
import './Header.css';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-search">
        {/* Placeholder for future search */}
      </div>
      <div className="header-actions">
        <button className="icon-btn">
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <User size={20} />
        </div>
      </div>
    </header>
  );
};
