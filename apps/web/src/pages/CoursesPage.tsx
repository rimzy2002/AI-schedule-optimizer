import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BookOpen, Calendar, PlusCircle, Clock, AlertCircle } from 'lucide-react';

interface CourseItem {
  id: string;
  title: string;
  course_code?: string | null;
  instructor?: string | null;
  semester?: string | null;
  created_at: string;
  taskCount: number;
  pendingReviewCount: number;
  confirmedCount: number;
  latestSchedule?: {
    id: string;
    status: string;
    created_at: string;
  } | null;
  latestSyllabus?: {
    id: string;
    analysis_status: string;
    created_at: string;
  } | null;
}

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/courses');
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="py-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title mb-1">My Courses</h1>
          <p className="page-subtitle mb-0">
            View saved courses, edit task drafts, and navigate to generated study schedules.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => fetchCourses()}>
            ↻ Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate('/import')}>
            <PlusCircle size={18} className="mr-2" /> Import Syllabus
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-secondary">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent mb-3" />
          <p>Loading your courses...</p>
        </div>
      ) : error ? (
        <Card className="p-8 text-center max-w-md mx-auto border-error bg-error-subtle">
          <AlertCircle className="mx-auto text-error mb-3" size={36} />
          <h2 className="text-h2 text-error mb-2">Error Loading Courses</h2>
          <p className="text-secondary text-sm mb-4">{error}</p>
          <Button variant="secondary" onClick={() => fetchCourses()}>Retry</Button>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="p-12 text-center max-w-lg mx-auto">
          <BookOpen className="mx-auto text-muted mb-4" size={48} />
          <h2 className="text-2xl font-bold text-primary mb-2">No Saved Courses</h2>
          <p className="text-secondary text-sm mb-6">
            You haven't imported any course syllabi yet. Import a syllabus to automatically extract assignments, quizzes, and exams.
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/import')}>
            Import Syllabus Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card key={course.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-xl font-bold text-primary break-words">{course.title}</h3>
                  {course.course_code && (
                    <Badge variant="default">{course.course_code}</Badge>
                  )}
                </div>

                {(course.instructor || course.semester) && (
                  <p className="text-xs text-muted mb-4">
                    {[course.instructor, course.semester].filter(Boolean).join(' • ')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="default">
                    {course.taskCount} {course.taskCount === 1 ? 'task' : 'tasks'}
                  </Badge>

                  {course.pendingReviewCount > 0 && (
                    <Badge variant="warning">
                      {course.pendingReviewCount} in draft
                    </Badge>
                  )}

                  {course.confirmedCount > 0 && (
                    <Badge variant="success">
                      {course.confirmedCount} confirmed
                    </Badge>
                  )}

                  {course.latestSchedule && (
                    <Badge variant="success">
                      ✓ Schedule ready
                    </Badge>
                  )}
                </div>

                {course.latestSyllabus && (
                  <div className="text-xs text-secondary mb-4 flex items-center gap-1.5">
                    <Clock size={14} className="text-muted" />
                    <span>
                      Syllabus: <strong className="capitalize">{course.latestSyllabus.analysis_status}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-subtle mt-4">
                <Link
                  to={`/courses/${course.id}/review`}
                  className="btn btn-secondary w-full py-2 text-center text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} /> Review Tasks ({course.taskCount})
                </Link>

                {course.latestSchedule ? (
                  <Link
                    to={`/schedule/${course.latestSchedule.id}`}
                    className="btn btn-primary w-full py-2 text-center text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} /> View Schedule
                  </Link>
                ) : (
                  <Link
                    to={`/courses/${course.id}/review`}
                    className="btn btn-outline w-full py-2 text-center text-sm font-medium text-secondary"
                  >
                    Generate Schedule
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
