import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage } from '../types';

export const sendMessage = async (tripId: string, senderId: string, text: string) => {
  try {
    await addDoc(collection(db, 'trips', tripId, 'messages'), {
      senderId,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}/messages`);
  }
};

export const deleteMessage = async (tripId: string, messageId: string) => {
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/messages/${messageId}`);
  }
};

export const subscribeToMessages = (tripId: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, 'trips', tripId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatMessage));
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `trips/${tripId}/messages`);
  });
};
