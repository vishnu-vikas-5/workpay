import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, isFirebaseConfigured, db } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  authLoading: boolean;
  isCloudAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  login: (role?: UserRole, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('workpay_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Safety fallback: Never leave authLoading hanging for more than 2 seconds (e.g. Brave Shields / offline)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check redirect result on load for mobile Google sign-in
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await handleFirebaseUserSync(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result info:', err);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await handleFirebaseUserSync(fbUser);
      } else {
        setUser(null);
        localStorage.removeItem('workpay_auth_user');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFirebaseUserSync = async (fbUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userRef);

      let profile: User;
      if (userDoc.exists()) {
        profile = {
          ...(userDoc.data() as User),
          role: 'admin',
        };
      } else {
        profile = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'WorkPay User',
          email: fbUser.email || '',
          role: 'admin',
          avatarUrl: fbUser.photoURL || undefined,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        const cleanProfile: any = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          createdAt: profile.createdAt,
        };
        if (profile.avatarUrl) cleanProfile.avatarUrl = profile.avatarUrl;
        await setDoc(userRef, cleanProfile);
      }

      setUser(profile);
      localStorage.setItem('workpay_auth_user', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not sync user profile with Firestore:', e);
      const fallback: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'WorkPay User',
        email: fbUser.email || '',
        role: 'admin',
        avatarUrl: fbUser.photoURL || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setUser(fallback);
      localStorage.setItem('workpay_auth_user', JSON.stringify(fallback));
    }
  };

  // Sign In with Email & Password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      if (!isFirebaseConfigured || !auth) {
        return { success: false, error: 'Firebase is not configured.' };
      }
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await handleFirebaseUserSync(cred.user);
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Login failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      }
      return { success: false, error: msg };
    }
  };

  // Create Account with Email & Password
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      if (!isFirebaseConfigured || !auth) {
        return { success: false, error: 'Firebase is not configured.' };
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const newProfile: User = {
        id: cred.user.uid,
        name: displayName?.trim() || email.split('@')[0],
        email: cred.user.email || email.trim(),
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setUser(newProfile);
      localStorage.setItem('workpay_auth_user', JSON.stringify(newProfile));
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Account creation failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account already exists with this email. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      return { success: false, error: msg };
    }
  };

  // Login with Google
  const signInWithGoogle = async () => {
    try {
      if (!isFirebaseConfigured || !auth) {
        return { success: false, error: 'Firebase is not configured.' };
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const cred = await signInWithPopup(auth, provider);
        await handleFirebaseUserSync(cred.user);
        return { success: true };
      } catch (popupErr: any) {
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          try {
            await signInWithRedirect(auth, provider);
            return { success: true };
          } catch (redirectErr: any) {
            return { success: false, error: redirectErr.message || 'Google sign-in was cancelled.' };
          }
        }
        return { success: false, error: popupErr.message || 'Google sign-in failed.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Google sign-in failed.' };
    }
  };

  const login = async (_selectedRole: UserRole = 'admin', email?: string) => {
    if (email) {
      const u: User = {
        id: 'usr-local',
        name: email.split('@')[0],
        email,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setUser(u);
      localStorage.setItem('workpay_auth_user', JSON.stringify(u));
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setFirebaseUser(null);
    setUser(null);
    localStorage.removeItem('workpay_auth_user');
  };

  const switchRole = (_newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: 'admin' });
    }
  };

  const isAuthenticated = Boolean(isFirebaseConfigured ? firebaseUser : (user || firebaseUser));
  const isCloudAuthenticated = Boolean(firebaseUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role: user?.role || 'admin',
        isAuthenticated,
        authLoading,
        isCloudAuthenticated,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        login,
        logout,
        switchRole,
        isAdmin: true,
        isManager: false,
        isEmployee: false,
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
