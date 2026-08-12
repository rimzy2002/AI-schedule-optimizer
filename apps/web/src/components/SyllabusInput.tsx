import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SyllabusInputProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
}

export const SyllabusInput: React.FC<SyllabusInputProps> = ({ onAnalyze, isLoading }) => {
  const [text, setText] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="text-secondary hover:text-primary transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold m-0">Import your syllabus</h1>
      </div>

      <div className="mb-6 max-w-2xl text-secondary">
        <p>Paste raw syllabus text.<br/>AI will extract assignments, weights and deadlines.</p>
      </div>

      <div className="flex-1 flex flex-col mb-6 w-full max-w-2xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste syllabus text here..."
          className="flex-1 w-full p-4 bg-bg-secondary border border-border-color rounded-lg resize-none text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all font-sans"
          disabled={isLoading}
        />
      </div>

      <div className="mb-8 max-w-2xl p-4 bg-bg-secondary/50 border border-border-color/50 rounded-lg text-sm text-secondary">
        <p>Nothing is added to your schedule until you review the extracted tasks.</p>
      </div>

      <div className="flex items-center justify-between w-full max-w-2xl">
        <span className="text-secondary text-sm font-medium">Step 1 of 3</span>
        <button
          onClick={() => onAnalyze(text)}
          disabled={!text.trim() || isLoading}
          className="px-6 py-3 bg-accent-primary hover:bg-accent-hover text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
        >
          Analyze syllabus
        </button>
      </div>
    </div>
  );
};
