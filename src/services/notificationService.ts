import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, onSnapshot, collection, query, where, limit, orderBy, getDoc, or, and } from 'firebase/firestore';
import { db, getFirebaseMessaging, handleFirestoreError, OperationType } from './firebase';
import { Trip, TripStatus } from '../types';

export class NotificationService {
  private messaging: Messaging | null = null;
  private unsubscribeTripListener: (() => void) | null = null;
  private unsubscribeCallListener: (() => void) | null = null;
  private seenTripIds = new Set<string>();

  async init(userId: string) {
    this.messaging = await getFirebaseMessaging();
    if (this.messaging) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(this.messaging, {
            vapidKey: 'YOUR_VAPID_KEY' // Usually provided in firebase console, but optional for internal testing sometimes
          });
          if (token) {
            await updateDoc(doc(db, 'users', userId), {
              fcmToken: token
            });
          }
        }
      } catch (err) {
        console.error('Notification init error:', err);
      }

      onMessage(this.messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // Show in-app notification logic can go here
        this.showToast(payload.notification?.title || 'Notification', payload.notification?.body || '');
      });
    }

    // Secondary in-app notification system via Firestore listeners
    this.setupTripListeners(userId);
    this.setupCallListeners(userId);
  }

  private async setupTripListeners(userId: string) {
    if (this.unsubscribeTripListener) this.unsubscribeTripListener();

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.warn('User profile not found for notifications init. Retrying in 2s...');
      setTimeout(() => this.setupTripListeners(userId), 2000);
      return;
    }
    const userData = userDoc.data();
    const isDriver = userData?.role === 'driver';

    const q = isDriver 
      ? query(
          collection(db, 'trips'), 
          or(
            where('status', '==', 'requested'),
            and(
              where('driverId', '==', userId),
              where('status', 'in', ['accepted', 'ongoing'])
            )
          ),
          orderBy('updatedAt', 'desc'), 
          limit(10)
        )
      : query(
          collection(db, 'trips'), 
          where('riderId', '==', userId), 
          orderBy('updatedAt', 'desc'), 
          limit(5)
        );

    this.unsubscribeTripListener = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const trip = { id: change.doc.id, ...change.doc.data() } as Trip;
        if (change.type === 'added' && isDriver && trip.status === 'requested') {
          this.showToast('New Trip Request', `New ride requested nearby for ₦${trip.price.toLocaleString()}`);
        } else if (change.type === 'modified') {
          this.handleTripStatusChange(trip);
        }
      });
    }, (error) => {
      if (error.message.includes('insufficient permissions')) {
        console.warn('Permissions error in trips-listener. Might be initial auth state delay.');
        return; 
      }
      if (this.unsubscribeTripListener) {
        handleFirestoreError(error, OperationType.GET, 'trips-listener');
      }
    });
  }

  private setupCallListeners(userId: string) {
    if (this.unsubscribeCallListener) this.unsubscribeCallListener();

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'negotiating'),
      limit(1)
    );

    this.unsubscribeCallListener = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          this.showToast('Incoming Video Call', 'A user is trying to reach you...');
        }
      });
    }, (error) => {
      if (this.unsubscribeCallListener) {
        handleFirestoreError(error, OperationType.GET, 'calls-listener');
      }
    });
  }

  private handleTripStatusChange(trip: Trip) {
    let title = '';
    let body = '';

    switch (trip.status) {
      case 'accepted':
        title = 'Trip Accepted';
        body = `A driver has accepted your request!`;
        break;
      case 'ongoing':
        title = 'Trip Started';
        body = 'Your trip is now underway.';
        break;
      case 'completed':
        title = 'Trip Completed';
        body = 'You have arrived at your destination.';
        break;
      case 'cancelled':
        title = 'Trip Cancelled';
        body = 'Your trip has been cancelled.';
        break;
    }

    if (title) {
      this.showToast(title, body);
    }
  }

  private showToast(title: string, body: string) {
    // This is a browser notification as fallback
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    // You could also dispatch a custom event for the UI to show a toast
    window.dispatchEvent(new CustomEvent('app-notification', { detail: { title, body } }));
  }

  stop() {
    if (this.unsubscribeTripListener) {
      this.unsubscribeTripListener();
      this.unsubscribeTripListener = null;
    }
    if (this.unsubscribeCallListener) {
      this.unsubscribeCallListener();
      this.unsubscribeCallListener = null;
    }
  }
}

export const notificationService = new NotificationService();
