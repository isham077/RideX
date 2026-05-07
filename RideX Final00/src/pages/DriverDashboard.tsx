import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { Ride, Booking, User, Baggage, BookingStatus } from "../types";
import { Shield, Zap, Leaf, Car, Calendar, MapPin, ArrowRight, Star, CheckCircle2, AlertTriangle, Users, Camera, ClipboardCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getTrustBadge } from "../services/rideService";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { RatingModal } from "../components/RatingModal";
import { createNotification, notifyMultipleUsers } from "../services/notificationService";

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<(User & { baggage?: Baggage; bookingId: string; bookingStatus: BookingStatus })[]>([]);
  const [selectedRatingPassenger, setSelectedRatingPassenger] = useState<{ passenger: User; ride: Ride } | null>(null);

  const loadDriverData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ridesQ = query(
        collection(db, "rides"), 
        where("driverId", "==", user.uid), 
        orderBy("createdAt", "desc")
      );
      const ridesSnap = await getDocs(ridesQ);
      setMyRides(ridesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ride)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "driver-dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [user]);

  // Auto-select active or pending ride on load
  useEffect(() => {
    if (myRides.length > 0 && !selectedRide) {
      const activeRide = myRides.find(r => r.status === "active");
      if (activeRide) {
        setSelectedRide(activeRide.id);
        loadPassengers(activeRide.id);
      } else {
        const pendingRide = myRides.find(r => r.status === "pending");
        if (pendingRide) {
          setSelectedRide(pendingRide.id);
          loadPassengers(pendingRide.id);
        }
      }
    }
  }, [myRides, selectedRide]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteAllRides = async () => {
    setIsDeletingAll(true);
    try {
      console.info("Starting mass deletion of all rides...");
      for (const ride of myRides) {
        // Cancel bookings
        const bookingsQ = query(collection(db, "bookings"), where("rideId", "==", ride.id));
        const bookingsSnap = await getDocs(bookingsQ);
        if (!bookingsSnap.empty) {
          const cancelPromises = bookingsSnap.docs.map(bDoc =>
            updateDoc(doc(db, "bookings", bDoc.id), { status: "cancelled" })
          );
          await Promise.all(cancelPromises);
          // Notify all booked passengers
          const passengerIds = bookingsSnap.docs.map(d => d.data().passengerId as string);
          const rideForDelete = myRides.find(r => r.id === ride.id);
          if (rideForDelete) {
            await notifyMultipleUsers(
              passengerIds,
              "ride_cancelled",
              "Ride Cancelled",
              `Your ride from ${rideForDelete.source} to ${rideForDelete.destination} has been cancelled by the driver.`,
              ride.id
            );
          }
        }
        // Delete ride
        await deleteDoc(doc(db, "rides", ride.id));
      }
      setMyRides([]);
      setSelectedRide(null);
      setShowDeleteAllConfirm(false);
      alert("All rides deleted and associated bookings cancelled.");
    } catch (error) {
      console.error("Mass deletion failed:", error);
      handleFirestoreError(error, OperationType.DELETE, "all-rides");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    console.info(`Attempting to delete ride: ${rideId}`);
    
    setDeletingId(rideId);
    try {
      console.info("Fetching associated bookings...");
      // 1. Cancel all associated bookings
      const bookingsQ = query(collection(db, "bookings"), where("rideId", "==", rideId));
      const bookingsSnap = await getDocs(bookingsQ);
      
      if (!bookingsSnap.empty) {
        console.info(`Found ${bookingsSnap.size} bookings. Cancelling...`);
        const cancelPromises = bookingsSnap.docs.map(bDoc =>
          updateDoc(doc(db, "bookings", bDoc.id), { status: "cancelled" })
        );
        await Promise.all(cancelPromises);
        console.info("All bookings cancelled.");
        // Notify passengers
        const passengerIds = bookingsSnap.docs.map(d => d.data().passengerId as string);
        const rideObj = myRides.find(r => r.id === rideId);
        if (rideObj) {
          await notifyMultipleUsers(
            passengerIds,
            "ride_cancelled",
            "Ride Cancelled",
            `Your ride from ${rideObj.source} to ${rideObj.destination} has been cancelled by the driver.`,
            rideId
          );
        }
      } else {
        console.info("No bookings found for this ride.");
      }

      // 2. Delete the ride
      console.info("Deleting ride document from Firestore...");
      await deleteDoc(doc(db, "rides", rideId));
      console.info("Ride document deleted successfully.");
      
      setMyRides(prev => prev.filter(r => r.id !== rideId));
      if (selectedRide === rideId) setSelectedRide(null);
      setConfirmDeleteId(null);
      alert("Ride successfully deleted.");
    } catch (error) {
      console.error("CRITICAL: Delete failed with error:", error);
      alert(`Failed to delete ride: ${error instanceof Error ? error.message : "Unknown error"}. Check console for details.`);
      handleFirestoreError(error, OperationType.DELETE, `rides/${rideId}`);
    } finally {
      setDeletingId(null);
      console.info("Delete sequence completed.");
    }
  };


  const loadPassengers = async (rideId: string) => {
    try {
      const bookingsQ = query(collection(db, "bookings"), where("rideId", "==", rideId));
      const bookingsSnap = await getDocs(bookingsQ);
      
      const baggageQ = query(collection(db, "baggage"), where("rideId", "==", rideId));
      const baggageSnap = await getDocs(baggageQ);
      const baggageMap: Record<string, Baggage> = {};
      baggageSnap.docs.forEach(d => {
        const b = { ...d.data(), id: d.id } as Baggage;
        baggageMap[b.passengerId] = b;
      });

      const pData = await Promise.all(bookingsSnap.docs.map(async (bDoc) => {
        const booking = bDoc.data() as Booking;
        const uDoc = await getDoc(doc(db, "users", booking.passengerId));
        return {
          ...(uDoc.data() as User),
          uid: uDoc.id,
          baggage: baggageMap[booking.passengerId],
          bookingId: bDoc.id,
          bookingStatus: booking.status
        };
      }));
      setPassengers(pData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `passengers/${rideId}`);
    }
  };

  const handleBookingAction = async (bookingId: string, status: "confirmed" | "cancelled") => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status });

      // Notify the passenger
      const passenger = passengers.find(p => p.bookingId === bookingId);
      if (passenger && selectedRide) {
        const rideObj = myRides.find(r => r.id === selectedRide);
        if (rideObj) {
          if (status === "confirmed") {
            await createNotification(
              passenger.uid,
              "booking_confirmed",
              "Booking Confirmed! ✅",
              `Your booking for ${rideObj.source} → ${rideObj.destination} has been confirmed by the driver.`,
              selectedRide
            );
          } else {
            await createNotification(
              passenger.uid,
              "booking_rejected",
              "Booking Rejected",
              `Your booking for ${rideObj.source} → ${rideObj.destination} was not accepted by the driver.`,
              selectedRide
            );
          }
        }
      }
      
      if (status === "cancelled") {
        const p = passengers.find(pass => pass.bookingId === bookingId);
        if (p && selectedRide) {
          const rideRef = doc(db, "rides", selectedRide);
          const rideSnap = await getDoc(rideRef);
          if (rideSnap.exists()) {
            const currentSeats = rideSnap.data().seatsAvailable || 0;
            await updateDoc(rideRef, { 
              seatsAvailable: currentSeats + 1 
            });
            setMyRides(prev => prev.map(r => r.id === selectedRide ? { ...r, seatsAvailable: currentSeats + 1 } : r));
          }
        }
      }

      setPassengers(prev => prev.map(p => p.bookingId === bookingId ? { ...p, bookingStatus: status } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      console.info(`Completing ride: ${rideId}`);
      // 1. Update ride status
      await updateDoc(doc(db, "rides", rideId), { status: "completed" });
      
      // 2. Mark all confirmed bookings as completed and award small trust score boost
      const confirmedPassengers = passengers.filter(p => p.bookingStatus === "confirmed");
      const updatePromises = confirmedPassengers.map(async (p) => {
        // Update booking status
        const bookingUpdate = updateDoc(doc(db, "bookings", p.bookingId), { status: "completed" });
        
        // Award Trust Score boost for completing a ride
        const userRef = doc(db, "users", p.uid);
        const userSnap = await getDoc(userRef);
        let trustUpdate = Promise.resolve();
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          trustUpdate = updateDoc(userRef, {
            trustScore: Math.min(100, (userData.trustScore || 50) + 1),
            completionRate: Math.min(100, (userData.completionRate || 0) + 1)
          });
        }
        
        return Promise.all([bookingUpdate, trustUpdate]);
      });
      await Promise.all(updatePromises);

      // 3. Update local state
      setMyRides(prev => prev.map(r => r.id === rideId ? { ...r, status: "completed" } : r));
      setPassengers(prev => prev.map(p =>
        p.bookingStatus === "confirmed" ? { ...p, bookingStatus: "completed" as BookingStatus } : p
      ));

      // Notify all confirmed passengers
      const confirmedPassengerIds = confirmedPassengers.map(p => p.uid);
      const rideForComplete = myRides.find(r => r.id === rideId);
      if (rideForComplete && confirmedPassengerIds.length > 0) {
        await notifyMultipleUsers(
          confirmedPassengerIds,
          "ride_completed",
          "Ride Completed ⭐",
          `Your ride from ${rideForComplete.source} to ${rideForComplete.destination} is complete. Don't forget to rate your driver!`,
          rideId
        );
      }
      
      alert("Ride successfully completed! Trust scores have been updated for both driver and passengers.");
    } catch (error) {
      console.error("Failed to complete ride:", error);
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handlePassengerArrived = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: "completed" });
      setPassengers(prev => prev.map(p => p.bookingId === bookingId ? { ...p, bookingStatus: "completed" as BookingStatus } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  if (!user) return null;
  const trustBadge = getTrustBadge(user.trustScore);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <AnimatePresence>
        {selectedRatingPassenger && (
          <RatingModal 
            ride={selectedRatingPassenger.ride}
            targetUserId={selectedRatingPassenger.passenger.uid}
            targetUserName={selectedRatingPassenger.passenger.displayName}
            onClose={() => setSelectedRatingPassenger(null)}
            onSuccess={() => {
              setSelectedRatingPassenger(null);
            }}
          />
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-8 mb-12"
      >
        <div className="flex-1 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Car size={160} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Driver Performance</h2>
            <div className="flex items-end gap-6 mb-8">
              <div className="text-7xl font-black text-white tracking-tighter">{user.trustScore}%</div>
              <div className="flex flex-col mb-2">
                <span className={cn("text-xl font-bold tracking-tight", trustBadge.color)}>{trustBadge.label}</span>
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Platform Standing</span>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <MetricItem label="Rating" value={`${(user.rating || 0).toFixed(1)}/10`} icon={<Star size={14} className="text-yellow-500" />} />
                <MetricItem label="Completion" value={`${user.completionRate}%`} icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
                <MetricItem label="Reliability" value={`${user.reliability}%`} icon={<Zap size={14} className="text-blue-500" />} />
              </div>
              
              <div className="pt-6 border-t border-zinc-800/50">
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                  <span>Next Level: Elite Driver</span>
                  <span>{100 - user.trustScore}% to go</span>
                </div>
                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${user.trustScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex flex-col justify-between">
          <div>
            <Shield className="text-emerald-500 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Verified Driver</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Your identity and vehicle documents are verified. This increases your visibility to passengers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] uppercase tracking-widest">
            <CheckCircle2 size={14} /> Status: Active
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white tracking-tight">My Offered Rides</h3>
            <Link to="/offer" className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
              + New
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-pulse" />)
            ) : myRides.length > 0 ? (
              myRides.map(ride => (
                <div
                  key={ride.id}
                  onClick={() => {
                    setSelectedRide(ride.id);
                    loadPassengers(ride.id);
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all group relative cursor-pointer",
                    selectedRide === ride.id 
                      ? "bg-emerald-500/10 border-emerald-500/50" 
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-zinc-100 flex items-center gap-2 mb-1">
                        {ride.source} <ArrowRight size={12} className="text-zinc-600" /> {ride.destination}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        {new Date(ride.dateTime).toLocaleDateString()}
                      </div>
                    </div>
                    {ride.status === "pending" && (
                      <div className="flex items-center gap-2 z-30 relative pointer-events-auto">
                        {confirmDeleteId === ride.id ? (
                          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-red-500/30">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteRide(ride.id); }}
                              disabled={deletingId === ride.id}
                              className="px-2 py-1 text-[8px] font-mono uppercase tracking-widest bg-red-600 text-white rounded"
                            >
                              {deletingId === ride.id ? "..." : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDeleteId(ride.id);
                            }}
                            className="p-3 -m-2 text-zinc-600 hover:text-red-500 transition-colors"
                            title="Delete Ride"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              ))
            ) : (
              <div className="p-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
                No rides offered
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRide ? (
              <motion.div
                key={selectedRide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Users className="text-emerald-500" /> Passenger Verification
                  </h3>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    Ride ID: {selectedRide.slice(-6)}
                  </div>
                </div>

                {myRides.find(r => r.id === selectedRide)?.status === "active" && (
                  <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-emerald-400 font-bold mb-1">Ride in Progress</h4>
                      <p className="text-xs text-zinc-400">Mark as completed when all passengers reach their destination.</p>
                    </div>
                    <button 
                      onClick={() => handleCompleteRide(selectedRide)}
                      className="px-6 py-3 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-white/10"
                    >
                      Finish Ride
                    </button>
                  </div>
                )}

                {myRides.find(r => r.id === selectedRide)?.status === "pending" && (
                  <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-blue-400 font-bold mb-1">Pending Ride</h4>
                      <p className="text-xs text-zinc-400">Start the ride once passengers are boarded.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, "rides", selectedRide), { status: "active" });
                          setMyRides(prev => prev.map(r => r.id === selectedRide ? { ...r, status: "active" } : r));
                          // Notify all confirmed passengers that ride has started
                          const confirmedPassengerIds = passengers
                            .filter(p => p.bookingStatus === "confirmed")
                            .map(p => p.uid);
                          const rideForStart = myRides.find(r => r.id === selectedRide);
                          if (rideForStart && confirmedPassengerIds.length > 0) {
                            await notifyMultipleUsers(
                              confirmedPassengerIds,
                              "ride_started",
                              "Your Ride Has Started! 🚗",
                              `Your ride from ${rideForStart.source} to ${rideForStart.destination} is now in progress.`,
                              selectedRide
                            );
                          }} catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `rides/${selectedRide}`);
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      Start Ride
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {passengers.length > 0 ? (
                    passengers.map(passenger => (
                      <div key={passenger.uid} className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                              <Users size={20} className="text-zinc-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">{passenger.displayName}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Trust Score:</span>
                                <span className="text-xs font-bold text-emerald-500">{passenger.trustScore}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 items-center">
                            {myRides.find(r => r.id === selectedRide)?.status === "completed" && passenger.bookingStatus === "completed" && (
                              <button 
                                onClick={() => {
                                  const ride = myRides.find(r => r.id === selectedRide);
                                  if (ride) {
                                    setSelectedRatingPassenger({ passenger, ride });
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/40"
                              >
                                <Star size={14} /> Rate Passenger
                              </button>
                            )}

                            {myRides.find(r => r.id === selectedRide)?.status === "active" && passenger.bookingStatus === "confirmed" && (
                               <button 
                                onClick={() => handlePassengerArrived(passenger.bookingId)}
                                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                              >
                                <ClipboardCheck size={14} /> Mark as Arrived
                              </button>
                            )}

                            {passenger.bookingStatus === "pending" ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleBookingAction(passenger.bookingId, "confirmed")}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleBookingAction(passenger.bookingId, "cancelled")}
                                  className="px-4 py-2 bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-lg transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : passenger.bookingStatus === "confirmed" ? (
                              <>
                                {passenger.baggage ? (
                                  <div className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                                    <img 
                                      src={passenger.baggage.imageUrl} 
                                      alt="Baggage" 
                                      className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                                    />
                                    <div>
                                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">Baggage Declared</p>
                                      <button 
                                        className="text-xs font-bold text-emerald-500 flex items-center gap-1 hover:text-emerald-400 transition-colors"
                                        onClick={() => alert("Verification logic would go here")}
                                      >
                                        <ClipboardCheck size={14} /> Verify Now
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-yellow-500">
                                    <AlertTriangle size={16} />
                                    <span className="text-xs font-medium">No Baggage Declared</span>
                                  </div>
                                )}
                              </>
                            ) : (
                               <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
                                 Rejected/Cancelled
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-zinc-600 font-mono text-sm uppercase tracking-widest">
                      No passengers booked yet
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                <Car size={48} className="mb-4 opacity-20" />
                <p className="font-mono text-sm uppercase tracking-widest">Select a ride to manage passengers</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {myRides.length > 0 && (
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-3xl">
            <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest font-mono mb-2">Danger Zone</h4>
            <p className="text-zinc-500 text-xs mb-6 max-w-xl">
              Deleting all rides will immediately cancel all active bookings and remove all ride records from the platform. This action is permanent.
            </p>
            {showDeleteAllConfirm ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <p className="text-red-500 text-[10px] font-bold font-mono uppercase tracking-widest animate-pulse">Confirm Mass Deletion?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowDeleteAllConfirm(false)}
                    className="px-6 py-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAllRides}
                    disabled={isDeletingAll}
                    className="px-6 py-3 bg-red-600 text-white hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    {isDeletingAll ? "Deleting..." : "Yes, Delete Everything"}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteAllConfirm(true);
                }}
                disabled={isDeletingAll}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                <Trash2 size={14} /> {isDeletingAll ? "Deleting All..." : "Delete All My Rides"}
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
