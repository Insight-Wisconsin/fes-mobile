import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get all stored users
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        return { success: false, error: 'No users found. Please sign up first.' };
      }

      const users = JSON.parse(usersData);
      
      // Find user by username
      const foundUser = users.find((u: any) => u.username === username);
      
      if (!foundUser) {
        return { success: false, error: 'Username not found.' };
      }

      // Check password
      if (foundUser.password !== password) {
        return { success: false, error: 'Incorrect password.' };
      }

      // Login successful - store current user
      const currentUser = {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        name: foundUser.name,
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      setUser(currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login.' };
    }
  };

  const signup = async (username: string, email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get existing users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if username already exists
      const existingUser = users.find((u: any) => u.username === username);
      if (existingUser) {
        return { success: false, error: 'Username already exists.' };
      }

      // Check if email already exists
      const existingEmail = users.find((u: any) => u.email === email);
      if (existingEmail) {
        return { success: false, error: 'Email already exists.' };
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(), // Simple ID generation
        username,
        email,
        password, // In real app, this should be hashed
        name,
        createdAt: new Date().toISOString(),
      };

      // Add to users array
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Auto-login the new user
      const currentUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(currentUser));
      setUser(currentUser);

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An error occurred during signup.' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
