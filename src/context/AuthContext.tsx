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
  login: (email?: string, password?: string) => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default logged in for easy access, can toggle log out

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user: defaultUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
