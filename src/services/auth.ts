import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole } from '../types';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (role: UserRole = 'rider') => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // FIX: Do NOT mix serverTimestamp() with a plain string for the same field.
      // The Firestore rule checks: data.updatedAt == request.time
      // So we must use serverTimestamp() for updatedAt (and optionally createdAt).
      // We omit createdAt from the isValidUser check, so it's safe to use serverTimestamp here.
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: role,
        status: 'online',
        // FIX: Use serverTimestamp() — NOT new Date().toISOString()
        // The Firestore rule requires updatedAt == request.time for user creation.
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } else {
      const currentData = userDoc.data();
      if (currentData.role !== role) {
        await setDoc(doc(db, 'users', user.uid), {
          role: role,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    }
    
    return user;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
    throw error;
  }
};

export const logout = () => signOut(auth);

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};
