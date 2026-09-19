import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDb } from '../db/localDb';
import { syncOfflineQueue } from '../services/syncService';

interface NetworkContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPendingCount = async () => {
    try {
      const count = await localDb.offlineQueue.where('synced').equals(0 as any).count();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  /**
   * Sincronización manual o automática al volver online.
   * No lanza excepciones — los errores se capturan internamente en syncOfflineQueue.
   */
  const syncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
    } catch {
      // syncOfflineQueue ya maneja sus propios errores; este catch es por seguridad
    } finally {
      setIsSyncing(false);
      // Actualizar el contador tras la sincronización
      await refreshPendingCount();
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await refreshPendingCount();
      // Disparar sincronización automática al recuperar conexión
      await syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing, pendingCount, refreshPendingCount, syncNow }}>
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork debe ser utilizado dentro de un NetworkProvider');
  }
  return context;
}
