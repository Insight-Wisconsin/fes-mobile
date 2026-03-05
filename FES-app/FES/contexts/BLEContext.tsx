import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import { bleService, BLEConnectionState } from '../services/ble/bleService';

interface BLEContextType {
  connectionState: BLEConnectionState;
  statusMessage: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setIntensity: (level: number) => Promise<void>;
  startStimulation: () => Promise<void>;
  stopStimulation: () => Promise<void>;
  ping: () => Promise<void>;
  isConnected: boolean;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);

export const BLEProvider = ({ children }: { children: ReactNode }) => {
  const [connectionState, setConnectionState] = useState<BLEConnectionState>('disconnected');
  const [statusMessage, setStatusMessage] = useState('Not connected');
  const isMounted = useRef(true);

  useEffect(() => {
    bleService.setStateCallback((state, message) => {
      if (!isMounted.current) return;
      setConnectionState(state);
      setStatusMessage(message ?? stateToMessage(state));
    });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      await bleService.scanAndConnect();
    } catch {
      // Error state already set by the service callback
    }
  }, []);

  const disconnect = useCallback(async () => {
    await bleService.disconnect();
  }, []);

  const setIntensity = useCallback(async (level: number) => {
    try {
      await bleService.setIntensity(level);
    } catch (err: any) {
      console.warn('[BLE] Failed to set intensity:', err.message);
    }
  }, []);

  const startStimulation = useCallback(async () => {
    try {
      await bleService.startStimulation();
    } catch (err: any) {
      Alert.alert('BLE Error', 'Failed to start stimulation');
    }
  }, []);

  const stopStimulation = useCallback(async () => {
    try {
      await bleService.stopStimulation();
    } catch (err: any) {
      Alert.alert('BLE Error', 'Failed to stop stimulation');
    }
  }, []);

  const ping = useCallback(async () => {
    try {
      await bleService.ping();
    } catch (err: any) {
      console.warn('[BLE] Ping failed:', err.message);
    }
  }, []);

  const value: BLEContextType = {
    connectionState,
    statusMessage,
    connect,
    disconnect,
    setIntensity,
    startStimulation,
    stopStimulation,
    ping,
    isConnected: connectionState === 'connected',
  };

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (context === undefined) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

function stateToMessage(state: BLEConnectionState): string {
  switch (state) {
    case 'disconnected': return 'Not connected';
    case 'scanning': return 'Scanning...';
    case 'connecting': return 'Connecting...';
    case 'connected': return 'Connected';
    case 'error': return 'Connection error';
  }
}
