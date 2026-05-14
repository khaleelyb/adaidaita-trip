import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Rating, PaymentMethod, UserProfile } from '../types';

export const addRating = async (tripId: string, fromId: string, toId: string, ratingValue: number, comment?: string) => {
  try {
    await addDoc(collection(db, 'ratings'), {
      tripId,
      fromId,
      toId,
      rating: ratingValue,
      comment,
      createdAt: serverTimestamp(),
    });
    
    // Update user average rating (simplified for demo)
    const userRef = doc(db, 'users', toId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      const currentRating = data.rating || 5;
      const ratingCount = data.ratingCount || 0;
      const newRating = ((currentRating * ratingCount) + ratingValue) / (ratingCount + 1);
      await updateDoc(userRef, {
        rating: newRating,
        ratingCount: ratingCount + 1
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ratings');
  }
};

export const addPaymentMethod = async (userId: string, type: 'card' | 'paypal' | 'cash', lastFour?: string) => {
  try {
    await addDoc(collection(db, 'users', userId, 'paymentMethods'), {
      userId,
      type,
      lastFour,
      isDefault: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/paymentMethods`);
  }
};

export const getPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'users', userId, 'paymentMethods'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/paymentMethods`);
  }
  return [];
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users');
  }
  return [];
};
