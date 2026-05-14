import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit,
  getDocs,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Trip, TripStatus, Location, UserRole } from '../types';

export const requestTrip = async (riderId: string, origin: Location, destination: Location, price: number) => {
  try {
    const tripData: Partial<Trip> = {
      riderId,
      type: 'ride',
      status: 'requested',
      origin,
      destination,
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'trips'), {
      ...tripData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'trips');
  }
};

export const acceptTrip = async (tripId: string, driverId: string) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      driverId,
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}`);
  }
};

export const updateTripLocation = async (tripId: string, location: Location) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      currentLocation: location,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}`);
  }
};

export const startTrip = async (tripId: string) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      status: 'ongoing',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}`);
  }
};

export const completeTrip = async (tripId: string, driverId?: string, price: number = 0) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });

    if (driverId) {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, {
        earnings: increment(price),
        tripCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}`);
  }
};

export const cancelTrip = async (tripId: string) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}`);
  }
};

export const deleteTrip = async (tripId: string) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    await deleteDoc(tripRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}`);
  }
};

export const getTrips = async (userId: string, role: UserRole): Promise<Trip[]> => {
  try {
    const field = role === 'rider' ? 'riderId' : 'driverId';
    const q = query(
      collection(db, 'trips'),
      where(field, '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'trips');
  }
  return [];
};

export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'all_trips');
  }
  return [];
};

export const subscribeToActiveTrip = (tripId: string, callback: (trip: Trip) => void) => {
  return onSnapshot(doc(db, 'trips', tripId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Trip);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
  });
};

export const subscribeToAvailableTrips = (callback: (trips: Trip[]) => void) => {
  const q = query(
    collection(db, 'trips'), 
    where('status', '==', 'requested'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
    callback(trips);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'available-trips');
  });
};
