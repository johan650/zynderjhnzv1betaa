import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  username: string;
  role: 'user' | 'admin';
  membership: 'FREE' | 'STARTER' | 'PRO' | 'VIP';
  accountStatus: 'active' | 'suspended';
  createdAt?: Timestamp | any;
  lastLoginAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface UserActivityLog {
  id?: string;
  activityId?: string;
  uid: string;
  activityType: string;
  description: string;
  timestamp: any;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithDemoAccount: (role?: 'user' | 'admin') => Promise<void>;
  signOutUser: () => Promise<void>;
  logActivity: (activityType: string, description: string, status?: 'SUCCESS' | 'FAILED') => Promise<void>;
  updateProfileDetails: (data: { displayName?: string; username?: string }) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Generate safe readable username from email or display name
  const generateUsername = (email: string | null, displayName: string | null): string => {
    if (displayName) {
      const sanitized = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitized.length >= 3) {
        return `${sanitized}_${Math.floor(100 + Math.random() * 900)}`;
      }
    }
    if (email) {
      const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      return `${prefix}_${Math.floor(100 + Math.random() * 900)}`;
    }
    return `zynder_${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Helper to record activity into Firestore
  const logActivity = async (
    activityType: string,
    description: string,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
  ) => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const path = 'user_activity';

    try {
      await addDoc(collection(db, path), {
        uid: currentUid,
        activityType,
        description,
        timestamp: serverTimestamp(),
        status,
      });
    } catch (error) {
      console.error('Failed to record user activity:', error);
      // We don't block the UI if logging fails
    }
  };

  // Synchronize Firestore user document upon authentication
  const syncUserProfile = async (authUser: User) => {
    const userDocRef = doc(db, 'users', authUser.uid);
    const path = `users/${authUser.uid}`;

    try {
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        // Existing user: update lastLoginAt and read profile
        const data = docSnap.data() as UserProfile;
        try {
          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Could not update lastLoginAt timestamp:', e);
        }
        setUserProfile(data);
      } else {
        // New user: create document with default FREE role and generated username
        const initialProfile: UserProfile = {
          uid: authUser.uid,
          displayName: authUser.displayName || 'Pengguna Zynder',
          email: authUser.email || '',
          photoURL: authUser.photoURL || '',
          username: generateUsername(authUser.email, authUser.displayName),
          role: 'user',
          membership: 'FREE',
          accountStatus: 'active',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, initialProfile);
        setUserProfile(initialProfile);
      }

      // Log successful login activity
      await logActivity(
        'Login',
        `Pengguna berhasil masuk melalui Google Authentication (${authUser.email})`,
        'SUCCESS'
      );
    } catch (err: any) {
      console.error('Error synchronizing user profile:', err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  // Listen to Firebase Auth state transitions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
        } catch (e: any) {
          setAuthError(e?.message || 'Gagal memuat data profil pengguna.');
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      await syncUserProfile(result.user);
    } catch (error: any) {
      console.warn('[FirebaseAuth] Google Sign-in requires domain authorization:', error?.code || error?.message);
      let message = 'Terjadi kesalahan saat masuk dengan Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Jendela login Google ditutup sebelum selesai.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Popup diblokir oleh browser. Harap izinkan popup untuk domain ini.';
      } else if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
        message = 'Domain aplikasi belum terdaftar di Authorized Domains Firebase Authentication.';
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithDemoAccount = async (role: 'user' | 'admin' = 'user') => {
    setLoading(true);
    setAuthError(null);
    try {
      const isAdm = role === 'admin';
      const mockEmail = isAdm ? 'sumiyatun993@gmail.com' : 'demo.user@zynderjhnz.com';
      const mockUid = isAdm ? 'admin_demo_zynder' : 'user_demo_zynder';

      const mockUser: any = {
        uid: mockUid,
        displayName: isAdm ? 'Administrator Zynder' : 'Demo User Zynder',
        email: mockEmail,
        photoURL: '',
        emailVerified: true,
        getIdToken: async () => `mock_token_${isAdm ? 'admin_' : ''}${Date.now()}`,
      };

      setUser(mockUser);
      setUserProfile({
        uid: mockUid,
        displayName: mockUser.displayName,
        email: mockEmail,
        photoURL: '',
        username: isAdm ? 'admin_zynder' : 'demo_user',
        role,
        membership: isAdm ? 'VIP' : 'FREE',
        accountStatus: 'active',
      });
    } catch (err: any) {
      console.warn('[DemoAuth] Failed to sign in with demo account:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    // 1. Non-blocking activity logging (never block user logout on firestore/network)
    try {
      if (user && auth.currentUser) {
        logActivity(
          'Logout',
          `Pengguna keluar dari sesi dashboard (${user.email || 'Pengguna'})`,
          'SUCCESS'
        ).catch((e) => console.warn('[Auth] Non-blocking logout activity log warning:', e));
      }
    } catch (e) {
      // Ignore logging failure
    }

    try {
      // 2. Sign out from Firebase Auth instance
      await signOut(auth);
    } catch (error: any) {
      console.warn('[FirebaseAuth] Sign-out warning:', error?.message || error);
    } finally {
      // 3. Unconditionally clear all user states so UI always returns to logged out state
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
      setLoading(false);
      try {
        sessionStorage.clear();
      } catch (e) {}
    }
  };

  const updateProfileDetails = async (data: { displayName?: string; username?: string }) => {
    if (!user) throw new Error('Pengguna belum terautentikasi.');
    const userDocRef = doc(db, 'users', user.uid);

    try {
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });

      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));

      await logActivity(
        'Profile Updated',
        'Informasi profil akun diperbarui',
        'SUCCESS'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        signInWithGoogle,
        signInWithDemoAccount,
        signOutUser,
        logActivity,
        updateProfileDetails,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
