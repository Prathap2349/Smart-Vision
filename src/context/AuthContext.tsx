import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, signInWithGoogle, signOutSupabase } from '../services/supabase';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  institution: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (identifier: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('svs_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('svs_user_session');
  });

  useEffect(() => {
    // Listen for Supabase OAuth redirects
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Resident Owner',
          role: 'Home Resident Owner',
          department: 'Google Account',
          institution: 'Smart Vision Home',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        };
        setUser(profile);
        setIsAuthenticated(true);
        localStorage.setItem('svs_user_session', JSON.stringify(profile));
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Resident Owner',
          role: 'Home Resident Owner',
          department: 'Google Account',
          institution: 'Smart Vision Home',
          email: session.user.email || '',
          avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        };
        setUser(profile);
        setIsAuthenticated(true);
        localStorage.setItem('svs_user_session', JSON.stringify(profile));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password?: string) => {
    // If email + password provided, attempt real Supabase authentication first
    if (identifier.includes('@') && password && password.length >= 6) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (!error && data.session?.user) {
        const profile: UserProfile = {
          id: data.session.user.id,
          name: data.session.user.user_metadata?.full_name || identifier.split('@')[0],
          role: 'Home Resident Owner',
          department: 'Verified Supabase Account',
          institution: 'Smart Vision Home',
          email: data.session.user.email || identifier,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        };
        setUser(profile);
        setIsAuthenticated(true);
        localStorage.setItem('svs_user_session', JSON.stringify(profile));
        return;
      }
    }

    // Graceful Prototype/Demo Fallback
    const profile: UserProfile = {
      id: identifier || 'default_user',
      name: identifier.includes('@') ? identifier.split('@')[0] : `Resident (${identifier})`,
      role: 'Home Resident Owner (Prototype)',
      department: 'Smart Vision Mobile',
      institution: 'Smart Vision Home',
      email: identifier.includes('@') ? identifier : `${identifier}@mobile.user`,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    };
    setUser(profile);
    setIsAuthenticated(true);
    localStorage.setItem('svs_user_session', JSON.stringify(profile));
  };

  const handleLoginWithGoogle = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await signOutSupabase();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('svs_user_session');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, loginWithGoogle: handleLoginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
