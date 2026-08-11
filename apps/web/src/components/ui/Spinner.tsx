import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'var(--accent-primary)' }) => {
  return (
    <div 
      className={`spinner spinner-${size}`} 
      style={{ borderTopColor: color }}
    />
  );
};
