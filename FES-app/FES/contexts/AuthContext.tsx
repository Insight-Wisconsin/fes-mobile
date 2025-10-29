import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Session } from '@supabase/supabase-js';

// define user table
interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;  
  created_at: string;   
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

// context creation
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// user profile, loading status, supabase session
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);


  // session initialization
  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // query users table, sets user state with profile info
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, created_at, name')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          created_at: data.created_at,
          name: data.name,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };


  // fetches user profile --> success or error 
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get email from username
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        return { success: false, error: 'Username not found.' };
      }

      // Sign in with email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: password,
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        await fetchUserProfile(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An error occurred during login.' };
    }
  };


  // creates new user data --> success or error
  const signup = async (username: string, email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check username availability
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { success: false, error: 'Username already exists.' };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: 'Failed to create account.' };

      // Create profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            username: username,
            email: email,
            name: name,
            created_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        return { success: false, error: 'Failed to create user profile.' };
      }

      await fetchUserProfile(authData.user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'An error occurred during signup.' };
    }
  };

  // signs out of supabase Auth, clears session
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!session,
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