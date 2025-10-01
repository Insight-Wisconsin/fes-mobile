import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, AppContextType, User } from './types/navigation';

// Initial state
const initialState: AppState = {
  auth: {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  },
  device: {
    isConnected: false,
    isCalibrated: false,
    isSessionActive: false,
    batteryLevel: 0,
    currentIntensity: 0,
    error: null,
  },
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: true,
          error: null,
        },
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user: action.payload,
          isLoading: false,
          error: null,
        },
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: action.payload,
        },
      };
    case 'SIGNUP_REQUEST':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: true,
          error: null,
        },
      };
    case 'SIGNUP_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user: action.payload,
          isLoading: false,
          error: null,
        },
      };
    case 'SIGNUP_FAILURE':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: action.payload,
        },
      };
    case 'LOGOUT':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: false,
          user: null,
          error: null,
        },
      };
    case 'CONNECT_DEVICE':
      return {
        ...state,
        device: {
          ...state.device,
          isConnected: true,
          error: null,
        },
      };
    case 'DISCONNECT_DEVICE':
      return {
        ...state,
        device: {
          ...state.device,
          isConnected: false,
          isSessionActive: false,
          error: null,
        },
      };
    case 'START_SESSION':
      return {
        ...state,
        device: {
          ...state.device,
          isSessionActive: true,
        },
      };
    case 'STOP_SESSION':
      return {
        ...state,
        device: {
          ...state.device,
          isSessionActive: false,
        },
      };
    case 'CALIBRATE_DEVICE':
      return {
        ...state,
        device: {
          ...state.device,
          isCalibrated: true,
        },
      };
    case 'UPDATE_BATTERY_LEVEL':
      return {
        ...state,
        device: {
          ...state.device,
          batteryLevel: action.payload,
        },
      };
    default:
      return state;
  }
};

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Mock authentication functions - replace with actual API calls
  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_REQUEST' });
    
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock successful login for demo purposes
        if (email && password) {
          const user: User = {
            id: '1',
            name: 'Demo User',
            email: email,
          };
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
          resolve();
        } else {
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Invalid credentials' });
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    dispatch({ type: 'SIGNUP_REQUEST' });
    
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock successful signup for demo purposes
        if (name && email && password) {
          const user: User = {
            id: '1',
            name: name,
            email: email,
          };
          dispatch({ type: 'SIGNUP_SUCCESS', payload: user });
          resolve();
        } else {
          dispatch({ type: 'SIGNUP_FAILURE', payload: 'Signup failed' });
          reject(new Error('Signup failed'));
        }
      }, 1000);
    });
  };

  const logout = async (): Promise<void> => {
    dispatch({ type: 'LOGOUT' });
  };

  const connectDevice = async (): Promise<void> => {
    // Mock device connection
    dispatch({ type: 'CONNECT_DEVICE' });
  };

  const disconnectDevice = (): void => {
    dispatch({ type: 'DISCONNECT_DEVICE' });
  };

  const startSession = (): void => {
    dispatch({ type: 'START_SESSION' });
  };

  const stopSession = (): void => {
    dispatch({ type: 'STOP_SESSION' });
  };

  const calibrateDevice = async (): Promise<void> => {
    // Mock device calibration
    dispatch({ type: 'CALIBRATE_DEVICE' });
  };

  const updateBatteryLevel = (level: number): void => {
    dispatch({ type: 'UPDATE_BATTERY_LEVEL', payload: level });
  };

  const value: AppContextType = {
    state,
    dispatch,
    login,
    signup,
    logout,
    connectDevice,
    disconnectDevice,
    startSession,
    stopSession,
    calibrateDevice,
    updateBatteryLevel,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
