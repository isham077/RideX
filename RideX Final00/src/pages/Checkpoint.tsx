import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { Ride, Booking, User, Baggage } from "../types";
import { Shield, QrCode, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";

export const Checkpoint: React.FC = () => {
  const { user } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [passengers, setPassengers] = useState<(User & { baggage?: Baggage })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadActiveRide = async () => {
      setLoading(true);
      try {
        let ride: Ride | null = null;
        // Find most recent active or pending ride
        const q = query(
          collection(db, "rides"), 
          where("driverId", "==", user.uid), 
          where("status", "in", ["pending", "active"]),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          ride = { ...snap.docs[0].data(), id: snap.docs[0].id } as Ride;
        } else {
          // Check if user is a passenger in an active ride
          const bQ = query(
            collection(db, "bookings"),
            where("passengerId", "==", user.uid),
            where("status", "==", "confirmed"),
            orderBy("timestamp", "desc")
          );
          const bSnap = await getDocs(bQ);
          if (!bSnap.empty) {
            const booking = bSnap.docs[0].data() as Booking;
            const rDoc = await getDoc(doc(db, "rides", booking.rideId));
            if (rDoc.exists()) {
              ride = { ...rDoc.data(), id: rDoc.id } as Ride;
            }
          }
        }

        if (ride) {
          setActiveRide(ride);
          
          // Fetch Driver
          const dDoc = await getDoc(doc(db, "users", ride.driverId));
          if (dDoc.exists()) setDriver({ ...dDoc.data(), uid: dDoc.id } as User);

          // Fetch Passengers & Baggage
          const bQ = query(collection(db, "bookings"), where("rideId", "==", ride.id), where("status", "==", "confirmed"));
          const bSnap = await getDocs(bQ);
          
          const bagQ = query(collection(db, "baggage"), where("rideId", "==", ride.id));
          const bagSnap = await getDocs(bagQ);
          const bagMap: Record<string, Baggage> = {};
          bagSnap.docs.forEach(d => {
            const b = { ...d.data(), id: d.id } as Baggage;
            bagMap[b.passengerId] = b;
          });

          const pData: (User & { baggage?: Baggage })[] = [];
          for (const docB of bSnap.docs) {
            const booking = docB.data() as Booking;
            const pDoc = await getDoc(doc(db, "users", booking.passengerId));
            if (pDoc.exists()) {
              pData.push({
                ...pDoc.data(),
                uid: pDoc.id,
                baggage: bagMap[booking.passengerId]
              } as User & { baggage?: Baggage });
            }
          }
          setPassengers(pData);
          
          // Generate Checkpoint Manifest Snapshot
          if (ride.driverId === user.uid) {
            const manifest = {
              driver: { 
                displayName: dDoc.data()?.displayName || "Unknown", 
                trustScore: dDoc.data()?.trustScore || 0, 
                rating: dDoc.data()?.rating || 0 
              },
              passengers: pData.map(p => ({
                uid: p.uid,
                displayName: p.displayName,
                baggage: p.baggage ? { description: p.baggage.description, imageUrl: p.baggage.imageUrl } : null
              })),
              generatedAt: new Date().toISOString()
            };
            try {
              await updateDoc(doc(db, "rides", ride.id), { checkpointManifest: manifest });
            } catch (err) {
              console.error("Failed to generate checkpoint manifest:", err);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "checkpoint");
      } finally {
        setLoading(false);
      }
    };

    loadActiveRide();
  }, [user]);

  if (loading) return <div className="p-20 text-center font-mono text-emerald-500">INITIALIZING_PROTOCOL...</div>;

  const checkpointUrl = activeRide 
    ? `${window.location.origin}/ride-info/${activeRide.id}` 
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Police Checkpoint Mode</h1>
        <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Digital Verification • Safety Protocol • Real-time Sync</p>
      </div>

      {!activeRide ? (
        <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl">
          <AlertTriangle size={48} className="text-zinc-700 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Ride Found</h3>
          <p className="text-zinc-500 text-sm mb-8">You must be in an active ride to generate a checkpoint QR code.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/search" className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all">Find Ride</Link>
            <Link to="/offer" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all">Offer Ride</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* QR Code Card */}
          <div className="p-12 bg-white rounded-3xl flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <div className="mb-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <QRCodeSVG 
                value={checkpointUrl} 
                size={240} 
                level="M"
                includeMargin={true}
              />
            </div>
            <h3 className="text-2xl font-black text-black tracking-tighter mb-2">SCAN FOR VERIFICATION</h3>
            <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest mb-4">Ride ID: {activeRide.id.slice(0, 8)}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[8px] font-bold uppercase tracking-widest border border-emerald-500/20">
                <CheckCircle2 size={12} /> User Data Encoded
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[8px] font-bold uppercase tracking-widest border border-blue-500/20">
                <Shield size={12} /> Baggage Verified
              </div>
            </div>

            <div className="w-full pt-8 border-t border-zinc-100 text-left">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-4 text-center">Encoded Data Summary</p>
              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-tighter text-zinc-600">
                <div>Driver: {driver?.displayName}</div>
                <div>Passengers: {passengers.length}</div>
                <div className="col-span-2">Route: {activeRide.source} → {activeRide.destination}</div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Shield size={16} className="text-emerald-500" /> For Authorities
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Scanning this QR code will open a public verification page showing the driver's details, 
                passenger manifest, and current ride status. No login required for police.
              </p>
            </div>
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Info size={16} className="text-blue-500" /> Data Privacy
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Only essential safety information is shared. Private user data like phone numbers 
                and addresses remain encrypted and hidden.
              </p>
            </div>
          </div>

          {/* Ride Summary */}
          <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-3xl">
            <h4 className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono mb-6">Current Ride Manifest</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Route</span>
                <span className="text-zinc-100 font-bold">{activeRide.source} → {activeRide.destination}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Status</span>
                <span className="text-emerald-500 font-bold uppercase tracking-widest">{activeRide.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Timestamp</span>
                <span className="text-zinc-100 font-mono">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
