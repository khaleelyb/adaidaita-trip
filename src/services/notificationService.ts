import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, onSnapshot, collection, query, where, limit, orderBy, getDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging, handleFirestoreError, OperationType } from './firebase';
import { Trip } from '../types';

export class NotificationService {
  private messaging: Messaging | null = null;
  private unsubscribeRiderListener: (() => void) | null = null;
  private unsubscribeDriverListener: (() => void) | null = null;
  private unsubscribeCallListener: (() => void) | null = null;

  async init(userId: string) {
    this.messaging = await getFirebaseMessaging();
    if (this.messaging) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(this.messaging, {
            vapidKey: 'YOUR_VAPID_KEY'
          });
          if (token) {
            await updateDoc(doc(db, 'users', userId), { fcmToken: token });
          }
        }
      } catch (err) {
        console.error('Notification init error:', err);
      }

      onMessage(this.messaging, (payload) => {
        this.showToast(
          payload.notification?.title || 'Notification',
          payload.notification?.body || ''
        );
      });
    }

    this.setupTripListeners(userId);
    this.setupCallListeners(userId);
  }

  private async setupTripListeners(userId: string) {
    // Clean up previous listeners
    if (this.unsubscribeRiderListener) this.unsubscribeRiderListener();
    if (this.unsubscribeDriverListener) this.unsubscribeDriverListener();

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.warn('User profile not found for notifications init. Retrying in 2s...');
      setTimeout(() => this.setupTripListeners(userId), 2000);
      return;
    }

    const userData = userDoc.data();
    const isDriver = userData?.role === 'driver';

    if (isDriver) {
      // FIX: Replace compound or() query with two separate simple queries.
      // Query 1: New incoming requests (all drivers can see these)
      const qRequested = query(
        collection(db, 'trips'),
        where('status', '==', 'requested'),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );

      this.unsubscribeRiderListener = onSnapshot(qRequested, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const trip = { id: change.doc.id, ...change.doc.data() } as Trip;
          if (change.type === 'added') {
            this.showToast(
              'New Trip Request',
              `New ride requested nearby for ₦${trip.price.toLocaleString()}`
            );
          }
        });
      }, (error) => {
        // Silently ignore permission errors during auth state transition
        if (!error.message.includes('insufficient permissions')) {
          console.warn('Notification trip-listener error:', error.message);
        }
      });

      // Query 2: Trips this driver has accepted/is driving
      const qDriverTrips = query(
        collection(db, 'trips'),
        where('driverId', '==', userId),
        where('status', 'in', ['accepted', 'ongoing']),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );

      this.unsubscribeDriverListener = onSnapshot(qDriverTrips, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const trip = { id: change.doc.id, ...change.doc.data() } as Trip;
            this.handleTripStatusChange(trip);
          }
        });
      }, (error) => {
        if (!error.message.includes('insufficient permissions')) {
          console.warn('Notification driver-trip-listener error:', error.message);
        }
      });

    } else {
      // Rider: watch their own trips for status changes
      const qRiderTrips = query(
        collection(db, 'trips'),
        where('riderId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );

      this.unsubscribeRiderListener = onSnapshot(qRiderTrips, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const trip = { id: change.doc.id, ...change.doc.data() } as Trip;
            this.handleTripStatusChange(trip);
          }
        });
      }, (error) => {
        if (!error.message.includes('insufficient permissions')) {
          console.warn('Notification rider-trip-listener error:', error.message);
        }
      });
    }
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
      if (!error.message.includes('insufficient permissions')) {
        console.warn('Notification call-listener error:', error.message);
      }
    });
  }

  private handleTripStatusChange(trip: Trip) {
    const messages: Record<string, { title: string; body: string }> = {
      accepted: { title: 'Trip Accepted', body: 'A driver has accepted your request!' },
      ongoing:  { title: 'Trip Started',  body: 'Your trip is now underway.' },
      completed:{ title: 'Trip Completed',body: 'You have arrived at your destination.' },
      cancelled:{ title: 'Trip Cancelled',body: 'Your trip has been cancelled.' },
    };

    const msg = messages[trip.status];
    if (msg) this.showToast(msg.title, msg.body);
  }

  private showToast(title: string, body: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    window.dispatchEvent(new CustomEvent('app-notification', { detail: { title, body } }));
  }

  stop() {
    this.unsubscribeRiderListener?.();
    this.unsubscribeRiderListener = null;
    this.unsubscribeDriverListener?.();
    this.unsubscribeDriverListener = null;
    this.unsubscribeCallListener?.();
    this.unsubscribeCallListener = null;
  }
}

export const notificationService = new NotificationService();
