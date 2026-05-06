import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Ride, User, Booking, Baggage } from "../types";
import { Shield, CheckCircle2, MapPin, Users, Calendar, Clock, AlertTriangle } from "lucide-react";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";

export const PublicRideInfo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [passengers, setPassengers] = useState<(User & { baggage?: Baggage })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadPublicData = async () => {
      try {
        const rideDoc = await getDoc(doc(db, "rides", id));
        if (rideDoc.exists()) {
          const rideData = { ...rideDoc.data(), id: rideDoc.id } as Ride;
          setRide(rideData);

          const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
          if (driverDoc.exists()) {
            setDriver({ ...driverDoc.data(), uid: driverDoc.id } as User);
          }

          const bookingsQ = query(collection(db, "bookings"), where("rideId", "==", id), where("status", "==", "confirmed"));
          const bookingsSnap = await getDocs(bookingsQ);
          
          const baggageQ = query(collection(db, "baggage"), where("rideId", "==", id));
          const baggageSnap = await getDocs(baggageQ);
          const baggageMap: Record<string, Baggage> = {};
          baggageSnap.docs.forEach(d => {
            const b = { ...d.data(), id: d.id } as Baggage;
            baggageMap[b.passengerId] = b;
          });

          const passengerData: (User & { baggage?: Baggage })[] = [];
          for (const bDoc of bookingsSnap.docs) {
            const booking = bDoc.data() as Booking;
            const pDoc = await getDoc(doc(db, "users", booking.passengerId));
            if (pDoc.exists()) {
              passengerData.push({ 
                ...pDoc.data(), 
                uid: pDoc.id,
                baggage: baggageMap[booking.passengerId]
              } as User & { baggage?: Baggage });
            }
          }
          setPassengers(passengerData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `public-ride/${id}`);
      } finally {
        setLoading(false);
      }
    };

    loadPublicData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-emerald-500 font-mono">VERIFYING_RIDE_PROTOCOL...</div>;
  if (!ride || !driver) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono">INVALID_RIDE_ID</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-emerald-500 text-black rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <div className="flex items-center gap-4">
            <Shield size={32} />
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase">Police Verification</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Ride Protocol Active</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold font-mono">ID: {ride.id.slice(0, 8)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{ride.status}</div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Driver Details</h2>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-4xl font-black text-zinc-500">
              {driver.displayName.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{driver.displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Verified Driver</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Trust Score: {driver.trustScore}% • {driver.rating}/10 Rating
              </div>
            </div>
          </div>
        </div>

        {/* Ride Details */}
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Ride Information</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="text-emerald-500 mt-1" size={20} />
              <div>
                <div className="text-lg font-bold text-white">{ride.source} → {ride.destination}</div>
                <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Route Path</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <Calendar className="text-zinc-500" size={18} />
                <span className="text-sm text-zinc-100">{new Date(ride.dateTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-zinc-500" size={18} />
                <span className="text-sm text-zinc-100">{new Date(ride.dateTime).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Manifest */}
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Passenger Manifest ({passengers.length})</h2>
          <div className="space-y-6">
            {passengers.length > 0 ? passengers.map((p, i) => (
              <div key={p.uid} className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-zinc-100">{p.displayName}</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">Confirmed</div>
                </div>
                
                {p.baggage && (
                  <div className="pt-4 border-t border-zinc-900 grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">Baggage Declaration</p>
                      <p className="text-xs text-zinc-400 leading-relaxed italic">"{p.baggage.description}"</p>
                    </div>
                    {p.baggage.imageUrl && (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800">
                        <img 
                          src={p.baggage.imageUrl} 
                          alt="Baggage" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-[8px] text-white text-center font-mono uppercase tracking-widest">
                          Live Capture Verified
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-4 text-zinc-600 text-xs font-mono uppercase tracking-widest">No passengers booked</div>
            )}
          </div>
        </div>

        {/* Safety Warning */}
        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <p className="text-xs text-zinc-500 leading-relaxed">
            This information is provided for official law enforcement verification only. 
            Unauthorized sharing or misuse of this data is strictly prohibited under the platform's safety guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};
