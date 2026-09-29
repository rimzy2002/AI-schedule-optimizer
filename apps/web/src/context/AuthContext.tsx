import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage, StoredUser } from '../services/storage';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isNetworkError: boolean;
  authError: string | null;
  retryAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(storage.getUser());
  const [token, setToken] = useState<string | null>(storage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSession = async () => {
    setIsLoading(true);
    setIsNetworkError(false);
    setAuthError(null);

    const storedToken = storage.getToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      const fetchedUser = response.data.user;
      setUser(fetchedUser);
      setToken(storedToken);
      storage.setUser(fetchedUser);
      setIsNetworkError(false);
      setAuthError(null);
    } catch (err: any) {
      const isAuthFailure = err?.status === 401 || err?.status === 403 || err?.status === 404;
      if (isAuthFailure) {
        storage.clearAuth();
        setUser(null);
        setToken(null);
        setIsNetworkError(false);
        setAuthError(null);
      } else {
        // Network outage or server error: keep credentials, flag recoverable error state
        setIsNetworkError(true);
        setAuthError(err.message || 'Connection error. Unable to verify your session.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Restore session from token on mount
  useEffect(() => {
    restoreSession();

    // Listen to unauthorized events from apiClient
    const handleUnauthorized = () => {
      storage.clearAuth();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user: loggedInUser, token: authToken } = response.data;
    storage.setToken(authToken);
    storage.setUser(loggedInUser);
    setUser(loggedInUser);
    setToken(authToken);
  };

  const register = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { email, password });
    const { user: registeredUser, token: authToken } = response.data;
    storage.setToken(authToken);
    storage.setUser(registeredUser);
    setUser(registeredUser);
    setToken(authToken);
  };

  const logout = () => {
    storage.clearAuth();
    sessionStorage.clear();
    setUser(null);
    setToken(null);
    setIsNetworkError(false);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isNetworkError,
        authError,
        retryAuth: restoreSession,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
