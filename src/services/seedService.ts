import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trip, Location } from '../types';

const KANO_LOCATIONS: Location[] = [
  { lat: 12.0022, lng: 8.5920, address: 'Kano Central' },
  { lat: 11.9833, lng: 8.5167, address: 'Bayero University' },
  { lat: 12.0500, lng: 8.5333, address: 'Aminu Kano Intl Airport' },
  { lat: 11.9667, lng: 8.5833, address: 'Zaria Road' },
  { lat: 12.0333, lng: 8.6000, address: 'Sabon Gari' }
];

export const seedDemoTrips = async (riderId: string) => {
  const tripsRef = collection(db, 'trips');
  
  // Create some completed trips
  for (let i = 0; i < 3; i++) {
    const pickup = KANO_LOCATIONS[i % KANO_LOCATIONS.length];
    const dropoff = KANO_LOCATIONS[(i + 1) % KANO_LOCATIONS.length];
    
    await addDoc(tripsRef, {
      riderId,
      driverId: 'system-demo-driver',
      origin: pickup,
      destination: dropoff,
      status: 'completed',
      price: 1500 + i * 200,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      currentLocation: dropoff
    });
  }

  // Create one available request
  await addDoc(tripsRef, {
    riderId: 'system-demo-rider',
    origin: KANO_LOCATIONS[4],
    destination: KANO_LOCATIONS[0],
    status: 'requested',
    price: 1200,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const clearOldTrips = async () => {
  const snapshot = await getDocs(collection(db, 'trips'));
  const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'trips', d.id)));
  await Promise.all(deletePromises);
};
