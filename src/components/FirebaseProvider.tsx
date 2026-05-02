import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  researcherName: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [researcherName, setResearcherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // Hydrate or create user in Firestore
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let dName = user.displayName || 'Anonymous Researcher';
          if (userSnap.exists()) {
            dName = userSnap.data().displayName;
          } else {
            // Create explicitly
            await setDoc(userRef, {
              displayName: dName,
              email: user.email || '',
              createdAt: serverTimestamp()
            });
          }
          setResearcherName(dName);
        } else {
          setResearcherName(null);
        }
      } catch (err) {
        console.error("Error in auth state change:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in error:", err);
      alert("Failed to sign in: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, researcherName, signIn, signOut: handleSignOut }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error("useFirebase must be used within FirebaseProvider");
  return context;
}
