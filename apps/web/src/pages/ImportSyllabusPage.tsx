import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SyllabusInput } from '../components/SyllabusInput';
import { SyllabusProcessing } from '../components/SyllabusProcessing';
import { apiClient } from '../services/apiClient';

export const ImportSyllabusPage: React.FC = () => {
  const { syllabusId: paramSyllabusId } = useParams<{ syllabusId?: string }>();
  const [searchParams] = useSearchParams();
  const querySyllabusId = searchParams.get('syllabusId');
  const navigate = useNavigate();

  const [step, setStep] = useState<'input' | 'processing' | 'error'>('input');
  const [jobId, setJobId] = useState<string | null>(null);
  const [syllabusId, setSyllabusId] = useState<string | null>(paramSyllabusId || querySyllabusId || null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>(() => sessionStorage.getItem('last_import_raw_text') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const MAX_POLLS = 60; // 60 * 2000ms = 2 minutes timeout

  // On mount: check if there's an existing syllabus to resume polling
  useEffect(() => {
    const activeId = paramSyllabusId || querySyllabusId || sessionStorage.getItem('active_import_syllabus_id');
    
    if (activeId) {
      setSyllabusId(activeId);
      setStep('processing');
      // Resume check immediately
      apiClient.get(`/syllabi/status/${activeId}`)
        .then((data) => {
          if (data.status === 'completed' && data.courseId) {
            sessionStorage.removeItem('active_import_syllabus_id');
            sessionStorage.setItem('last_reviewed_course_id', data.courseId);
            navigate(`/courses/${data.courseId}/review`, { replace: true });
          } else if (data.status === 'failed') {
            sessionStorage.removeItem('active_import_syllabus_id');
            if (data.extractedText) setRawText(data.extractedText);
            setErrorMsg('AI extraction previously failed for this syllabus. You can edit and try again.');
            setStep('error');
          } else {
            // Still pending or processing
            setCourseId(data.courseId || null);
          }
        })
        .catch(() => {
          // If status fetch fails, also check for any active import
          apiClient.get('/syllabi/active')
            .then((active) => {
              if (active?.syllabusId) {
                setSyllabusId(active.syllabusId);
                setCourseId(active.courseId || null);
                setStep('processing');
              } else {
                setStep('input');
              }
            })
            .catch(() => {
              setStep('input');
            });
        });
    } else {
      // Check if user has an active pending import on server
      apiClient.get('/syllabi/active')
        .then((active) => {
          if (active?.syllabusId) {
            setSyllabusId(active.syllabusId);
            setCourseId(active.courseId || null);
            sessionStorage.setItem('active_import_syllabus_id', active.syllabusId);
            setStep('processing');
          }
        })
        .catch(() => {
          // Ignore error, stay in input
        });
    }
  }, [paramSyllabusId, querySyllabusId, navigate]);

  const handleAnalyze = async (text: string) => {
    if (isSubmitting) return; // Prevent duplicate submissions

    try {
      setIsSubmitting(true);
      setRawText(text);
      sessionStorage.setItem('last_import_raw_text', text);
      setStep('processing');
      setErrorMsg(null);
      setPollCount(0);
      
      const data = await apiClient.post('/syllabi/extract', { rawText: text });
      
      setJobId(data.jobId || null);
      setSyllabusId(data.syllabusId || null);
      setCourseId(data.courseId || null);

      if (data.syllabusId) {
        sessionStorage.setItem('active_import_syllabus_id', data.syllabusId);
        // Update URL to durable /import/:syllabusId
        navigate(`/import/${data.syllabusId}`, { replace: true });
      }
      if (data.courseId) {
        sessionStorage.setItem('last_reviewed_course_id', data.courseId);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred while starting syllabus extraction.');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll either job or syllabus status
  useEffect(() => {
    if (step !== 'processing') return;

    const pollStatus = async () => {
      setPollCount((prev) => {
        if (prev >= MAX_POLLS) {
          setErrorMsg('Processing took longer than expected. Please check your Courses page or try again.');
          setStep('error');
          sessionStorage.removeItem('active_import_syllabus_id');
          return prev;
        }
        return prev + 1;
      });

      try {
        if (jobId) {
          const data = await apiClient.get(`/syllabi/jobs/${jobId}`);
          if (data.status === 'completed') {
            const targetCourseId = data.courseId || courseId;
            sessionStorage.removeItem('active_import_syllabus_id');
            if (targetCourseId) {
              sessionStorage.setItem('last_reviewed_course_id', targetCourseId);
              navigate(`/courses/${targetCourseId}/review`, { replace: true });
            } else {
              navigate('/courses', { replace: true });
            }
          } else if (data.status === 'failed') {
            sessionStorage.removeItem('active_import_syllabus_id');
            throw new Error(data.error || 'AI analysis failed. Please try a different text or format.');
          }
        } else if (syllabusId) {
          const data = await apiClient.get(`/syllabi/status/${syllabusId}`);
          if (data.status === 'completed') {
            const targetCourseId = data.courseId || courseId;
            sessionStorage.removeItem('active_import_syllabus_id');
            if (targetCourseId) {
              sessionStorage.setItem('last_reviewed_course_id', targetCourseId);
              navigate(`/courses/${targetCourseId}/review`, { replace: true });
            } else {
              navigate('/courses', { replace: true });
            }
          } else if (data.status === 'failed') {
            sessionStorage.removeItem('active_import_syllabus_id');
            if (data.extractedText) setRawText(data.extractedText);
            throw new Error('AI analysis failed. Please verify the syllabus text and try again.');
          }
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error checking import status.');
        setStep('error');
      }
    };

    const pollInterval = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [jobId, syllabusId, step, navigate, courseId]);

  const handleRetry = () => {
    sessionStorage.removeItem('active_import_syllabus_id');
    setStep('input');
    navigate('/import', { replace: true });
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto p-6 md:p-12">
      {step === 'input' && (
        <SyllabusInput 
          onAnalyze={handleAnalyze} 
          isLoading={isSubmitting} 
          initialText={rawText}
        />
      )}
      
      {step === 'processing' && (
        <div>
          <SyllabusProcessing />
          <div className="text-center mt-4 text-xs text-secondary">
            Import is linked to this session. Refreshing will resume extraction tracking.
          </div>
        </div>
      )}
      
      {step === 'error' && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl" style={{ backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)' }}>!</div>
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-secondary mb-8 max-w-md">{errorMsg}</p>
          <button
            onClick={handleRetry}
            className="btn btn-secondary btn-lg"
          >
            Try Again with Preserved Text
          </button>
        </div>
      )}
    </div>
  );
};
