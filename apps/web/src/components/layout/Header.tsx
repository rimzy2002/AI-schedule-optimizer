import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-search">
        {/* Breadcrumb or search */}
      </div>
      <div className="header-actions">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="user-profile">
                <User size={18} />
              </div>
              <span className="text-sm font-medium text-primary hidden md:inline">
                {user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="icon-btn text-secondary hover:text-danger"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

