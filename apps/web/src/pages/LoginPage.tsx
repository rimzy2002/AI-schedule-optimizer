import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your study plan."
    >
      {error && (
        <div id="login-error-alert" role="alert" aria-live="assertive" className="auth-alert auth-alert-error">
          <AlertCircle size={18} className="auth-alert-icon" />
          <span className="auth-alert-message">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
        <Input
          id="login-email"
          name="email"
          label="Email address"
          type="email"
          placeholder="name@example.com"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          disabled={isSubmitting}
        />

        <Input
          id="login-password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          disabled={isSubmitting}
          rightElement={
            <button
              type="button"
              className="auth-visibility-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="login-password"
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Button
          id="login-submit-button"
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          disabled={isSubmitting}
          className="auth-submit-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="auth-spinner" size={18} />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <footer className="auth-footer">
        <span>New here?</span>
        <Link to="/register" className="auth-footer-link">
          Create an account
        </Link>
      </footer>
    </AuthLayout>
  );
};
