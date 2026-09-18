import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isBootstrapped: boolean | null;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  bootstrapAdmin: (data: {
    username: string;
    full_name: string;
    password: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  checkStatusAndSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isBootstrapped, setIsBootstrapped] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatusAndSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Validar estado general del sistema (¿Existe Administrador?)
      const status = await api.getSystemStatus();
      setIsBootstrapped(status.bootstrapped);

      // 2. Si el sistema está inicializado y tenemos un token, verificar la sesión
      const savedToken = api.getToken();
      if (status.bootstrapped && savedToken) {
        try {
          const authData = await api.getCurrentUser();
          setUser(authData.user);
          setToken(savedToken);
        } catch (authErr) {
          // Token vencido o usuario inactivo
          api.setToken(null);
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('Error al inicializar sesión:', err);
      // Si estamos offline y tenemos usuario guardado en localStorage, podríamos restaurar sesión de contingencia
      const localCachedUser = localStorage.getItem('mevacol_offline_user');
      if (localCachedUser) {
        try {
          setUser(JSON.parse(localCachedUser));
          setIsBootstrapped(true);
        } catch {
          setError(err.message || 'No fue posible conectar con el servidor.');
        }
      } else {
        setError(err.message || 'No fue posible conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndSession();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login({ identifier, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('mevacol_offline_user', JSON.stringify(res.user));
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bootstrapAdmin = async (data: {
    username: string;
    full_name: string;
    password: string;
    email?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.bootstrapAdmin(data);
      setUser(res.user);
      setToken(res.token);
      setIsBootstrapped(true);
      localStorage.setItem('mevacol_offline_user', JSON.stringify(res.user));
    } catch (err: any) {
      setError(err.message || 'Error al configurar el administrador inicial.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem('mevacol_offline_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isBootstrapped,
        isLoading,
        error,
        login,
        bootstrapAdmin,
        logout,
        checkStatusAndSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
