import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { Ride, Booking, User, Profile } from "../types";
import { Shield, Zap, Leaf, Calendar, MapPin, ArrowRight, Star, CheckCircle2, Search, Users, CheckCircle, Phone, UserPlus, Edit2, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getTrustBadge } from "../services/rideService";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { RatingModal } from "../components/RatingModal";

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState<(Booking & { ride: Ride; driver?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRatingRide, setSelectedRatingRide] = useState<{ ride: Ride; driver: User } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadPassengerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load Profile
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      if (profileDoc.exists()) {
        setProfile({ ...profileDoc.data(), id: profileDoc.id } as Profile);
      }

      const bookingsQ = query(
        collection(db, "bookings"), 
        where("passengerId", "==", user.uid), 
        orderBy("timestamp", "desc")
      );
      const bookingsSnap = await getDocs(bookingsQ);
      const bookingsData = await Promise.all(bookingsSnap.docs.map(async (bDoc) => {
        const booking = { ...bDoc.data(), id: bDoc.id } as Booking;
        const rideDoc = await getDoc(doc(db, "rides", booking.rideId));
        const ride = { ...rideDoc.data(), id: rideDoc.id } as Ride;
        
        let driver: User | undefined;
        if (ride) {
          const driverDoc = await getDoc(doc(db, "users", ride.driverId));
          if (driverDoc.exists()) {
            driver = { ...driverDoc.data(), uid: driverDoc.id } as User;
          }
        }

        return { ...booking, ride, driver };
      }));
      setMyBookings(bookingsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "passenger-dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassengerData();
  }, [user]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancelBooking = async (booking: Booking) => {
    setCancellingId(booking.id);
    try {
      // 1. Update the booking status
      await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled" });
      
      // 2. Free up seats
      const rideRef = doc(db, "rides", booking.rideId);
      const rideDoc = await getDoc(rideRef);
      if (rideDoc.exists()) {
        const currentSeats = rideDoc.data().seatsAvailable || 0;
        await updateDoc(rideRef, {
          seatsAvailable: currentSeats + booking.seatsBooked
        });
      }
      
      // Refresh list
      setConfirmCancelId(null);
      await loadPassengerData();
      alert("Booking successfully cancelled.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setCancellingId(null);
    }
  };

  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [showCancelAllConfirm, setShowCancelAllConfirm] = useState(false);

  const handleCancelAllBookings = async () => {
    setIsCancellingAll(true);
    try {
      let cancelledCount = 0;
      for (const booking of myBookings) {
        if (booking.status !== "cancelled" && booking.ride.status === "pending") {
          // Status change cancelled
          await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled" });
          
          // Free up seats
          const rideRef = doc(db, "rides", booking.rideId);
          const rideDoc = await getDoc(rideRef);
          if (rideDoc.exists()) {
            const currentSeats = rideDoc.data().seatsAvailable || 0;
            await updateDoc(rideRef, {
              seatsAvailable: currentSeats + booking.seatsBooked
            });
          }
          cancelledCount++;
        }
      }
      alert(`Successfully cancelled ${cancelledCount} eligible bookings.`);
      setShowCancelAllConfirm(false);
      await loadPassengerData();
    } catch (error) {
      console.error("Cancel all bookings failed:", error);
      alert("Failed to cancel all bookings. Some might have been processed.");
      handleFirestoreError(error, OperationType.UPDATE, "all-bookings");
    } finally {
      setIsCancellingAll(false);
    }
  };

  if (!user) return null;

  const trustBadge = getTrustBadge(user.trustScore);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <AnimatePresence>
        {selectedRatingRide && (
          <RatingModal 
            ride={selectedRatingRide.ride}
            targetUserId={selectedRatingRide.driver.uid}
            targetUserName={selectedRatingRide.driver.displayName}
            onClose={() => setSelectedRatingRide(null)}
            onSuccess={() => {
              setSelectedRatingRide(null);
              // Optionally refresh
            }}
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-3 gap-8 mb-12"
      >
        <div className="md:col-span-2 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap size={160} className="text-blue-500" />
          </div>
          <div className="relative z-10">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Passenger Profile</h2>
            <div className="flex items-end gap-6 mb-8">
              <div className="text-7xl font-black text-white tracking-tighter">{user.trustScore}%</div>
              <div className="flex flex-col mb-2">
                <span className={cn("text-xl font-bold tracking-tight", trustBadge.color)}>{trustBadge.label}</span>
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Platform Standing</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <MetricItem label="Rating" value={`${(user.rating || 0).toFixed(1)}/10`} icon={<Star size={14} className="text-yellow-500" />} />
              <MetricItem label="Completion" value={`${user.completionRate || 0}%`} icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
              <MetricItem label="Reliability" value={`${user.reliability || 0}%`} icon={<Zap size={14} className="text-blue-500" />} />
            </div>
          </div>
        </div>

        <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex flex-col justify-between">
          <div>
            <Leaf className="text-emerald-500 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Eco Impact</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              You've saved <span className="text-emerald-400 font-bold">{user.ecoImpact}kg</span> of CO2 by sharing rides. 
            </p>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-3/4 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Calendar className="text-zinc-500" /> My Bookings
        </h3>
        <Link to="/search" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all">
          <Search size={16} /> Find Rides
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-pulse" />)
        ) : myBookings.length > 0 ? (
          myBookings.map(booking => (
            <BookingCard 
              key={booking.id} 
              booking={booking} 
              onRate={() => {
                if (booking.driver) {
                  setSelectedRatingRide({ ride: booking.ride, driver: booking.driver });
                }
              }} 
              confirmCancelId={confirmCancelId}
              onConfirmCancel={setConfirmCancelId}
              cancellingId={cancellingId}
              onCancel={() => handleCancelBooking(booking)}
            />
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 p-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl text-zinc-600 font-mono text-sm uppercase tracking-widest">
            No bookings found
          </div>
        )}
      </div>


      <EmergencyContactSection 
        userId={user.uid} 
        initialProfile={profile} 
        onUpdate={(newProfile) => setProfile(newProfile)} 
      />

      {myBookings.some(b => b.status !== "cancelled" && b.ride.status === "pending") && (
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-3xl">
            <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest font-mono mb-2">Danger Zone</h4>
            <p className="text-zinc-500 text-xs mb-6 max-w-xl">
              Cancelling all bookings will remove you from all upcoming rides and notify the drivers.
            </p>
            {showCancelAllConfirm ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <p className="text-red-500 text-[10px] font-bold font-mono uppercase tracking-widest animate-pulse">Confirmed All Cancellations?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowCancelAllConfirm(false)}
                    className="px-6 py-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Keep My Bookings
                  </button>
                  <button 
                    onClick={handleCancelAllBookings}
                    disabled={isCancellingAll}
                    className="px-6 py-3 bg-red-600 text-white hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {isCancellingAll ? "Cancelling..." : "Yes, Cancel Everything"}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowCancelAllConfirm(true)}
                disabled={isCancellingAll}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                <X size={14} /> {isCancellingAll ? "Cancelling..." : "Cancel All My Upcoming Bookings"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</span>
    </div>
    <div className="text-lg font-bold text-white">{value}</div>
  </div>
);

const BookingCard: React.FC<{ 
  booking: Booking & { ride: Ride; driver?: User }; 
  onRate: () => void;
  onCancel: () => void;
  confirmCancelId: string | null;
  onConfirmCancel: (id: string | null) => void;
  cancellingId: string | null;
}> = ({ booking, onRate, onCancel, confirmCancelId, onConfirmCancel, cancellingId }) => (
  <div className="block p-6 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all group overflow-hidden">
    <div className="flex justify-between items-start mb-4">
      <div>
        <Link to={`/ride/${booking.rideId}`} className="text-sm font-medium text-zinc-100 flex items-center gap-2 hover:text-emerald-400">
          {booking.ride.source} <ArrowRight size={14} className="text-zinc-600" /> {booking.ride.destination}
        </Link>
        <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">
          {new Date(booking.ride.dateTime).toLocaleDateString()}
        </div>
      </div>
      <div className={cn(
        "px-2 py-1 rounded text-[10px] font-mono uppercase tracking-widest",
        booking.ride.status === "completed" ? "bg-blue-500/10 text-blue-500" :
        booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500" : 
        booking.status === "pending" ? "bg-blue-500/10 text-blue-500" :
        "bg-red-500/10 text-red-500"
      )}>
        {booking.ride.status === "completed" ? "Completed" : booking.status}
      </div>
    </div>

    {booking.driver && (
      <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-950 rounded-xl border border-zinc-900">
        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-600 border border-zinc-800">
          {booking.driver.displayName.charAt(0)}
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Driver</p>
          <p className="text-xs font-bold text-zinc-200">{booking.driver.displayName}</p>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
      <div className="text-xs text-zinc-400">
        {booking.seatsBooked} Seat(s) • ₹{booking.ride.price * booking.seatsBooked}
      </div>
      
      <div className="flex items-center gap-3">
        {booking.ride.status === "completed" ? (
          <button 
            onClick={onRate}
            className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <Star size={10} /> Rate Ride
          </button>
        ) : (booking.status === "confirmed" || booking.status === "pending") && booking.ride.status === "pending" ? (
          <div className="flex items-center gap-2">
            {confirmCancelId === booking.id ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onConfirmCancel(null)}
                  className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  No
                </button>
                <button 
                  onClick={onCancel}
                  disabled={cancellingId === booking.id}
                  className="text-[8px] font-mono uppercase tracking-widest text-white bg-red-600 px-2 py-1 rounded hover:bg-red-500 transition-all font-bold"
                >
                  {cancellingId === booking.id ? "..." : "Cancel"}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => onConfirmCancel(booking.id)}
                className="text-[10px] font-mono uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <X size={10} /> Cancel Booking
              </button>
            )}
          </div>
        ) : (
          <div className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
            <CheckCircle size={10} /> {booking.ride.status}
          </div>
        )}
      </div>
    </div>
  </div>
);


const EmergencyContactSection: React.FC<{ 
  userId: string; 
  initialProfile: Profile | null;
  onUpdate: (profile: Profile) => void;
}> = ({ userId, initialProfile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: initialProfile?.emergencyContact?.name || "",
    relationship: initialProfile?.emergencyContact?.relationship || "",
    phone: initialProfile?.emergencyContact?.phone || "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialProfile?.emergencyContact) {
      setFormData(initialProfile.emergencyContact);
    }
  }, [initialProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profileData = {
        userId,
        emergencyContact: formData,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "profiles", userId), profileData);
      onUpdate({ ...profileData, id: userId } as Profile);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "profiles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="text-emerald-500" /> Emergency Contact
          </h3>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">Safety First Protocol</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-all"
          >
            {initialProfile?.emergencyContact ? <Edit2 size={14} /> : <UserPlus size={14} />}
            {initialProfile?.emergencyContact ? "Edit Contact" : "Add Contact"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Contact Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="Full Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Relationship</label>
            <input 
              required
              type="text"
              value={formData.relationship}
              onChange={e => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="e.g. Spouse, Parent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Phone Number</label>
            <input 
              required
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="+91 00000 00000"
            />
          </div>
          <div className="md:col-span-3 flex gap-4">
            <button 
              disabled={loading}
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <Save size={18} /> {loading ? "Saving..." : "Save Contact"}
            </button>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : initialProfile?.emergencyContact ? (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2 italic">Name</p>
            <p className="text-xl font-bold text-white tracking-tight">{initialProfile.emergencyContact.name}</p>
          </div>
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2 italic">Relationship</p>
            <p className="text-xl font-bold text-white tracking-tight">{initialProfile.emergencyContact.relationship}</p>
          </div>
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2 italic">Phone</p>
            <p className="text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-3">
              <Phone size={18} /> {initialProfile.emergencyContact.phone}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl">
          <UserPlus size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">No emergency contact configured</p>
          <p className="text-zinc-600 text-xs mt-2 italic">Critical for safety verification during active rides</p>
        </div>
      )}
    </motion.div>
  );
};

