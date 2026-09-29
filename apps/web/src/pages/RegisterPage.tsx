import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Field validation logic matching backend contract (min 6 characters)
  const isPasswordTooShort = passwordTouched && password.length > 0 && password.length < 6;
  const isPasswordMismatch = confirmPasswordTouched && confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start organizing your coursework and study time."
    >
      {error && (
        <div id="register-error-alert" role="alert" aria-live="assertive" className="auth-alert auth-alert-error">
          <AlertCircle size={18} className="auth-alert-icon" />
          <span className="auth-alert-message">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
        <Input
          id="register-email"
          name="email"
          label="Email address"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          disabled={isSubmitting}
        />

        <Input
          id="register-password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          required
          value={password}
          helperText="Must be at least 6 characters."
          error={isPasswordTooShort ? 'Password must be at least 6 characters.' : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => setPasswordTouched(true)}
          disabled={isSubmitting}
          rightElement={
            <button
              type="button"
              className="auth-visibility-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="register-password"
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Input
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          error={isPasswordMismatch ? 'Passwords do not match.' : undefined}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setConfirmPasswordTouched(true);
            if (error) setError(null);
          }}
          onBlur={() => setConfirmPasswordTouched(true)}
          disabled={isSubmitting}
          rightElement={
            <button
              type="button"
              className="auth-visibility-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              aria-pressed={showConfirmPassword}
              aria-controls="register-confirm-password"
              tabIndex={0}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Button
          id="register-submit-button"
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
              <span>Creating account...</span>
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <footer className="auth-footer">
        <span>Already have an account?</span>
        <Link to="/login" className="auth-footer-link">
          Sign in
        </Link>
      </footer>
    </AuthLayout>
  );
};
