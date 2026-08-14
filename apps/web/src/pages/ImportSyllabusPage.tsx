/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyllabusInput } from '../components/SyllabusInput';
import { SyllabusProcessing } from '../components/SyllabusProcessing';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const ImportSyllabusPage: React.FC = () => {
  const [step, setStep] = useState<'input' | 'processing' | 'error'>('input');
  const [jobId, setJobId] = useState<string | null>(null);
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async (text: string) => {
    try {
      setStep('processing');
      setErrorMsg(null);
      
      const response = await fetch(`${API_URL}/syllabi/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start syllabus analysis.');
      }
      
      const data = await response.json();
      setJobId(data.jobId);
      setSyllabusId(data.syllabusId);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setStep('error');
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!jobId || step !== 'processing') return;

      try {
        const response = await fetch(`${API_URL}/syllabi/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          // Success! Redirect to review page with proposed tasks in state
          // For now, we mock the transition by logging and maybe showing an alert,
          // as the "Review Page" is not fully spec'd for Day 2 yet.
          console.log('Parsed tasks (Proposed State):', data.result);
          const proposedTasks = (data.result?.tasks || []).map((t: any, i: number) => {
            let status = 'Ready';
            if (!t.deadline) status = 'CHECK DATE';
            else if (t.weight == null || t.weight === 0) status = 'MISSING WEIGHT';
            
            return {
              ...t,
              id: t.id || `task-${i}-${Date.now()}`,
              status
            };
          });
          navigate('/review', { state: { proposedSyllabus: proposedTasks, courseName: data.result?.course, syllabusId } });
        } else if (data.status === 'failed') {
          throw new Error('AI analysis failed. Please try a different text or format.');
        }
        // If status is 'queued' or 'processing', do nothing and wait for next poll
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error checking job status.');
        setStep('error');
        clearInterval(pollInterval);
      }
    };

    if (jobId && step === 'processing') {
      pollInterval = setInterval(pollStatus, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, step, navigate]);

  return (
    <div className="w-full h-full max-w-4xl mx-auto p-6 md:p-12">
      {step === 'input' && (
        <SyllabusInput onAnalyze={handleAnalyze} isLoading={false} />
      )}
      
      {step === 'processing' && (
        <SyllabusProcessing />
      )}
      
      {step === 'error' && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl" style={{ backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)' }}>!</div>
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-secondary mb-8">{errorMsg}</p>
          <button
            onClick={() => setStep('input')}
            className="btn btn-secondary btn-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
