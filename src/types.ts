/**
 * Shared types for the Adaidata app
 */

export type UserRole = 'rider' | 'driver' | 'admin';
export type TripStatus = 'requested' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
export type TripType = 'ride' | 'delivery';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  currentTripId?: string;
  rating?: number;
  ratingCount?: number;
  earnings?: number;
  tripCount?: number;
  status: 'online' | 'offline' | 'busy';
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  riderId: string;
  driverId?: string;
  type: TripType;
  status: TripStatus;
  origin: Location;
  destination: Location;
  currentLocation?: Location;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallSignal {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'negotiating' | 'active' | 'ended';
  offer?: any;
  answer?: any;
  callerCandidates?: any[];
  receiverCandidates?: any[];
  createdAt: string;
}

export interface Rating {
  id: string;
  tripId: string;
  fromId: string;
  toId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'paypal' | 'cash';
  lastFour?: string;
  isDefault: boolean;
}
