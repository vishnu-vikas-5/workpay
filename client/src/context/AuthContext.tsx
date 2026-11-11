import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../services/seedData';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (role: UserRole, email?: string) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('workpay_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_USERS[0]; // Admin by default
      }
    }
    return INITIAL_USERS[0];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('workpay_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('workpay_auth_user');
    }
  }, [user]);

  const login = async (selectedRole: UserRole, email?: string) => {
    const users = await storageService.getUsers();
    let matchedUser = users.find((u) => u.role === selectedRole);
    if (email) {
      const emailUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (emailUser) matchedUser = emailUser;
    }
    if (!matchedUser) {
      matchedUser = INITIAL_USERS.find((u) => u.role === selectedRole) || INITIAL_USERS[0];
    }
    setUser(matchedUser);

    await storageService.logAction(
      'USER_LOGIN',
      'auth',
      matchedUser.id,
      matchedUser.name,
      matchedUser.role,
      { email: matchedUser.email, role: matchedUser.role }
    );
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser = INITIAL_USERS.find((u) => u.role === newRole) || INITIAL_USERS[0];
    setUser(targetUser);
  };

  const logout = () => {
    if (user) {
      storageService.logAction(
        'USER_LOGOUT',
        'auth',
        user.id,
        user.name,
        user.role,
        { email: user.email }
      );
    }
    setUser(null);
  };

  const role = user?.role || 'admin';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        isAdmin,
        isManager,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

