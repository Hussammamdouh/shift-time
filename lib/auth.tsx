'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyId: string;
  companyName: string;
  role?: 'admin' | 'employee';
  createdAt: number;
  updatedAt: number;
}

export interface Company {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  memberCount: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createEmployee: (email: string, password: string, displayName: string) => Promise<string>;
  changePassword: (newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (oobCode: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile and company data
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser && db) {
        try {
          // Load user profile
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setUserProfile(profileData);

            // Load company data
            if (profileData.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', profileData.companyId));
              if (companyDoc.exists()) {
                setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUserProfile(null);
        setCompany(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string, 
    password: string, 
    displayName: string, 
    companyName: string
  ) => {
    if (!auth || !db) throw new Error('Firebase not configured');

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update Firebase Auth display name
    await updateProfile(firebaseUser, { displayName });

    // Generate company ID
    const companyId = `company_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create company document
    const companyData: Omit<Company, 'id'> = {
      name: companyName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: firebaseUser.uid,
      memberCount: 1,
    };
    await setDoc(doc(db, 'companies', companyId), {
      ...companyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create user profile document
    const userProfileData: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName,
      companyId,
      companyName,
      role: 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userProfileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const signOut = async () => {
    if (!auth) throw new Error('Firebase not configured');
    await firebaseSignOut(auth);
    setUserProfile(null);
    setCompany(null);
  };

  const createEmployee = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    if (!auth || !db || !userProfile || !company) {
      throw new Error('Firebase not configured or user not authenticated');
    }

    if (userProfile.role !== 'admin') {
      throw new Error('Only admins can create employees');
    }

    // Store admin's email for re-authentication message
    const adminEmail = userProfile.email;
    
    try {
      // Create user account (this will sign in as the new user)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth display name
      await updateProfile(firebaseUser, { displayName });

      // Create user profile document with employee role
      const userProfileData: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        companyId: company.id,
        companyName: company.name,
        role: 'employee',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userProfileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update company member count
      await setDoc(
        doc(db, 'companies', company.id),
        {
          memberCount: (company.memberCount || 0) + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Sign out the newly created employee
      await firebaseSignOut(auth);
      
      // Return the admin email so the caller can redirect to login
      return adminEmail;
    } catch (error) {
      // Handle specific Firebase errors
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      } else if (firebaseError.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      } else if (firebaseError.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password');
      }
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!auth || !user) {
      throw new Error('User not authenticated');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    await updatePassword(user, newPassword);
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth/reset-password`,
      handleCodeInApp: false,
    });
  };

  const resetPassword = async (oobCode: string, newPassword: string) => {
    if (!auth) throw new Error('Firebase not configured');
    
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    await confirmPasswordReset(auth, oobCode, newPassword);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isEmployee = userProfile?.role === 'employee' || (!userProfile?.role && !!userProfile); // Default to employee if role not set

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      company, 
      loading, 
      isAdmin, 
      isEmployee, 
      signIn, 
      signUp, 
      signOut,
      createEmployee,
      changePassword,
      sendPasswordReset,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

