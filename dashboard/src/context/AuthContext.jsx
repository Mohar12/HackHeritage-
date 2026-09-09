/**
 * AuthContext.jsx
 * ===============
 * Global Authentication Context for HyperQDS.
 * Authoritative state bound directly to the PostgreSQL backend session (/auth/me).
 * 
 * Provides:
 * - user: UserProfile | null
 * - isAuthenticated: boolean
 * - isLoading: boolean (avoids flashing between unauthenticated / authenticated)
 * - login: ({ email, password }) => Promise<user>
 * - register: ({ email, password, fullName }) => Promise<user>
 * - logout: () => Promise<void>
 * - refreshAuth: () => Promise<user | null>
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser as apiLogin, registerUser as apiRegister, logoutUser as apiLogout } from '../services/authApi.js';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshAuth: async () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Authoritative session verification against backend
  const checkSession = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      if (userData && userData.id && userData.email) {
        setUser(userData);
        return userData;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      console.warn('Session verification notice:', err.message || err);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize session state on application load / refresh
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(credentials);
      if (data && data.user) {
        setUser(data.user);
        return data.user;
      }
      throw new Error('Malformed authentication response from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setIsLoading(true);
    try {
      const data = await apiRegister(formData);
      if (data && data.user) {
        setUser(data.user);
        return data.user;
      }
      throw new Error('Malformed registration response from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user && user.id),
    isLoading,
    login,
    register,
    logout,
    refreshAuth: checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
