import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { SupportTicket } from '../types';

export const createTicket = async (userId: string, subject: string, message: string) => {
  try {
    const docRef = await addDoc(collection(db, 'tickets'), {
      userId,
      subject,
      message,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'tickets');
  }
};

export const getMyTickets = async (userId: string): Promise<SupportTicket[]> => {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'tickets');
  }
  return [];
};

export const getAllTickets = async (): Promise<SupportTicket[]> => {
  try {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'all_tickets');
  }
  return [];
};

export const updateTicketStatus = async (ticketId: string, status: 'open' | 'pending' | 'closed') => {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tickets/${ticketId}`);
  }
};
