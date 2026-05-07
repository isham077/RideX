export type UserRole = "driver" | "passenger";
export type RideStatus = "pending" | "active" | "completed" | "cancelled";
export type BookingStatus = "confirmed" | "cancelled" | "pending" | "completed";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  trustScore: number;
  rating: number;
  completionRate: number;
  reliability: number;
  aadhaarUrl?: string;
  isVerified: boolean;
  ecoImpact: number;
}

export interface Ride {
  id: string;
  driverId: string;
  source: string;
  destination: string;
  dateTime: string;
  seatsAvailable: number;
  totalSeats: number;
  carSegment: CarSegment;
  price: number;
  distance: number;
  status: RideStatus;
  ecoImpact: number;
  createdAt: string;
  checkpointManifest?: {
    driver: { displayName: string; trustScore: number; rating: number };
    passengers: { uid: string; displayName: string; baggage: { description: string; imageUrl: string } | null }[];
    generatedAt: string;
  };
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  status: BookingStatus;
  timestamp: string;
}

export interface Review {
  id: string;
  rideId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-10
  comment: string;
  feedbackTags?: string[];
  timestamp: string;
}

export interface Declaration {
  id: string;
  rideId: string;
  userId: string;
  timestamp: string;
  accepted: boolean;
}

export interface Baggage {
  id: string;
  rideId: string;
  passengerId: string;
  imageUrl: string;
  description: string;
}

export interface Profile {
  id: string;
  userId: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  updatedAt: string;
}

export const CAR_SEGMENTS = ["Sedan", "SUV", "MPV"] as const;
export type CarSegment = typeof CAR_SEGMENTS[number];

export interface Alert {
  id: string;
  rideId: string;
  userId: string;
  type: "SOS";
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}
