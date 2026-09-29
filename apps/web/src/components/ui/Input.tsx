import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helperText,
  rightElement,
  id,
  className = '', 
  ...props 
}) => {
  const errorId = id && error ? `${id}-error` : undefined;
  const helperId = id && helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId, props['aria-describedby']].filter(Boolean).join(' ') || undefined;

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className={`input-container ${rightElement ? 'has-right-element' : ''}`}>
        <input 
          id={id}
          className={`input-field ${error ? 'input-error' : ''} ${className}`} 
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props} 
        />
        {rightElement && (
          <div className="input-right-element">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <span id={errorId} className="input-error-text" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className="input-helper-text">
          {helperText}
        </span>
      )}
    </div>
  );
};
