import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  highlight?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  glass = false, 
  highlight = false,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`card ${glass ? 'card-glass' : ''} ${highlight ? 'card-highlight' : ''} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};
