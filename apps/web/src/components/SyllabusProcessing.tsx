import React, { useEffect, useState } from 'react';

export const SyllabusProcessing: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-20">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-bg-tertiary rounded-full"></div>
        <div className="absolute inset-0 border-4 border-accent-primary rounded-full border-t-transparent animate-spin"></div>
        <div className="w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center">
          <span className="text-accent-primary font-bold text-xl">AI</span>
        </div>
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Analyzing your syllabus{dots}</h2>
        <p className="text-secondary">This usually takes about 5-10 seconds.</p>
      </div>

      <div className="max-w-md w-full p-6 bg-bg-secondary rounded-lg border border-border-color mt-8">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-4">What's happening?</h3>
        <ul className="space-y-3 text-sm text-text-secondary">
          <li className="flex items-start gap-3">
            <span className="text-accent-primary">✓</span>
            Reading unstructured text
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent-primary">✓</span>
            Identifying courses and modules
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent-primary animate-pulse">●</span>
            Extracting tasks, weights, and deadlines
          </li>
        </ul>
      </div>
    </div>
  );
};
