import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading, isNetworkError, authError, retryAuth } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
          <p className="text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (isNetworkError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-surface border border-subtle rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-error-subtle text-error flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-h2 font-bold text-primary mb-2">Connection Problem</h2>
          <p className="text-secondary text-sm mb-6">
            {authError || 'Could not verify your session with the server. Please check your network connection.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => retryAuth()}
              className="btn btn-primary w-full py-2 font-medium"
            >
              Retry Connection
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline w-full py-2 text-secondary"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
