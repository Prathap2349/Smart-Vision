import React, { createContext, useContext, useState } from 'react';

interface UserProfile {
  name: string;
  role: string;
  department: string;
  institution: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile;
  login: (identifier?: string, password?: string) => void;
  loginWithGoogle: () => void;
  logout: () => void;
}

const defaultUser: UserProfile = {
  name: 'Prathap S',
  role: 'Security Administrator',
  department: 'BTech AI&DS (C29)',
  institution: 'Rathinam Technical Campus',
  email: 'prathap.s@rathinam.edu.in',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(defaultUser);

  const login = (identifier?: string) => {
    if (identifier) {
      setUser(prev => ({
        ...prev,
        email: identifier.includes('@') ? identifier : `${identifier}@mobile.user`,
        name: identifier.includes('@') ? identifier.split('@')[0] : `Resident (${identifier})`,
      }));
    }
    setIsAuthenticated(true);
  };

  const loginWithGoogle = () => {
    setUser({
      name: 'Google User',
      role: 'Home Resident Owner',
      department: 'Gmail Connected',
      institution: 'Smart Vision Home',
      email: 'user@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
    });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
