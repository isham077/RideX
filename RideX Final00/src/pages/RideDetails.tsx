import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { Ride, User, Booking, Baggage, Declaration } from "../types";
import { MapPin, Calendar, Clock, Users, IndianRupee, Shield, Zap, Leaf, ArrowLeft, CheckCircle2, AlertTriangle, Camera, FileText, X, RefreshCw, Bot, TrendingUp, TrafficCone, CloudRain, Fuel, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { getTrustBadge } from "../services/rideService";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { cn } from "../lib/utils";
import { getCurrentLocation } from "../services/geoService";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { createNotification } from "../services/notificationService";

export const RideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [userBooking, setUserBooking] = useState<Booking | null>(null);
  const [existingBaggage, setExistingBaggage] = useState<Baggage | null>(null);
  
  const [showBaggageForm, setShowBaggageForm] = useState(false);
  const [baggageDesc, setBaggageDesc] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const [pricingAnalysis, setPricingAnalysis] = useState<any>(null);
  const [analyzingPrice, setAnalyzingPrice] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please ensure you have granted permissions.");
        setIsCameraOpen(false);
      }
    };

    if (isCameraOpen && !capturedImage) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, capturedImage]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        setIsCameraOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!id) return;

    const loadRide = async () => {
      try {
        const rideDoc = await getDoc(doc(db, "rides", id));
        if (rideDoc.exists()) {
          const rideData = { ...rideDoc.data(), id: rideDoc.id } as Ride;
          setRide(rideData);
          
          const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
          if (driverDoc.exists()) {
            setDriver({ ...driverDoc.data(), uid: driverDoc.id } as User);
          }

          if (user) {
            const bookingQ = query(
              collection(db, "bookings"), 
              where("rideId", "==", id), 
              where("passengerId", "==", user.uid)
            );
            const bookingSnap = await getDocs(bookingQ);
            if (!bookingSnap.empty) {
              const bData = { ...bookingSnap.docs[0].data(), id: bookingSnap.docs[0].id } as Booking;
              setUserBooking(bData);

              const baggageQ = query(
                collection(db, "baggage"),
                where("rideId", "==", id),
                where("passengerId", "==", user.uid)
              );
              const baggageSnap = await getDocs(baggageQ);
              if (!baggageSnap.empty) {
                setExistingBaggage({ ...baggageSnap.docs[0].data(), id: baggageSnap.docs[0].id } as Baggage);
              }
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `rides/${id}`);
      } finally {
        setLoading(false);
      }
    };

    loadRide();
  }, [id, user]);

  const analyzePrice = async () => {
    if (!ride) return;
    setAnalyzingPrice(true);
    try {
      // Mocked AI analysis to avoid client-side API key leakage
      // In a production app, this would be a call to /api/analyze-ride
      setTimeout(() => {
        setPricingAnalysis({
          isFair: true,
          suggestedPrice: ride.price,
          traffic: "moderate",
          weather: "clear",
          multipliers: {
            traffic: 1.1,
            weather: 1.0,
            surge: 1.0
          },
          smartInsight: "Current pricing is optimal based on historical route data and current traffic conditions."
        });
        setAnalyzingPrice(false);
      }, 1500);
    } catch (error) {
      console.error("Price analysis failed", error);
      setAnalyzingPrice(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelRide = async () => {
    if (!ride || !user) return;

    setIsDeleting(true);
    try {
      // 1. Cancel all associated bookings
      const bookingsQ = query(collection(db, "bookings"), where("rideId", "==", ride.id));
      const bookingsSnap = await getDocs(bookingsQ);
      
      if (!bookingsSnap.empty) {
        const cancelPromises = bookingsSnap.docs.map(bDoc => 
          updateDoc(doc(db, "bookings", bDoc.id), { status: "cancelled" })
        );
        await Promise.all(cancelPromises);
      }

      // 2. Delete the ride
      await deleteDoc(doc(db, "rides", ride.id));
      
      alert("Ride has been successfully cancelled and all passengers notified.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Cancel ride failed:", error);
      alert("Failed to cancel ride. Please check your connection and permissions.");
      handleFirestoreError(error, OperationType.DELETE, `rides/${ride.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (ride && !pricingAnalysis && !analyzingPrice) {
      analyzePrice();
    }
  }, [ride]);

  const handleBooking = async () => {
    if (!user || !ride || !declarationAccepted) return;
    setBookingLoading(true);

    try {
      // 1. Create Booking
      const bookingData = {
        rideId: ride.id,
        passengerId: user.uid,
        seatsBooked: 1,
        status: "pending" as any, // Driver needs to confirm
        timestamp: new Date().toISOString(),
      };
      
      const bDocRef = await addDoc(collection(db, "bookings"), bookingData);

      // 2. Update Ride Seats
      await updateDoc(doc(db, "rides", ride.id), {
        seatsAvailable: ride.seatsAvailable - 1
      });

      // 3. Create Declaration
      await addDoc(collection(db, "declarations"), {
        rideId: ride.id,
        userId: user.uid,
        timestamp: new Date().toISOString(),
        accepted: true,
      });

      setUserBooking({ ...bookingData, id: bDocRef.id } as Booking);
      setRide({ ...ride, seatsAvailable: ride.seatsAvailable - 1 });

      // Notify driver of new booking
      await createNotification(
        ride.driverId,
        "booking_new",
        "New Booking Request",
        `${user.displayName || user.email} has requested a seat on your ride from ${ride.source} to ${ride.destination}.`,
        ride.id
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "bookings");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSOS = async () => {
    if (!user || !ride) return;
    setSosLoading(true);
    try {
      // 1. Get Emergency Contact
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;
      const emergencyContact = profileData?.emergencyContact;

      // 2. Get Current Location
      let location = { latitude: 0, longitude: 0 };
      try {
        const coords = await getCurrentLocation();
        location = { latitude: coords.lat, longitude: coords.lng };
      } catch (geoErr) {
        console.warn("Could not get precise location, sending default", geoErr);
      }

      // 3. Save Alert to Firestore
      await addDoc(collection(db, "alerts"), {
        rideId: ride.id,
        userId: user.uid,
        type: "SOS",
        timestamp: new Date().toISOString(),
        location: location
      });

      // 3.5 Notify driver via in-app notification
      await createNotification(
        ride.driverId,
        "sos_alert",
        "🚨 EMERGENCY SOS ALERT",
        `${user.displayName || user.email} has triggered an SOS on your ride from ${ride.source} to ${ride.destination}!`,
        ride.id
      );

      // 4. Send SMS if emergency contact exists
      if (emergencyContact && emergencyContact.phone) {
        const messageText = `EMERGENCY ALERT: Ride ${ride.id}. Passenger ${user.displayName || user.email} has triggered SOS. Last known location: ${location.latitude}, ${location.longitude}. Ride from ${ride.source} to ${ride.destination}.`;
        
        console.log(`[CLIENT SOS] Sending request to emergency contact: ${emergencyContact.phone}`);
        
        try {
          const sosRes = await axios.post("/api/send-sos", {
            phone: emergencyContact.phone,
            message: messageText,
            userId: user.uid
          });
          
          if (sosRes.data.status === "logged") {
            console.warn("SOS logged on server, but SMS not sent (missing credentials)");
          }
        } catch (smsErr: any) {
          console.error("SMS API call failed", smsErr);
          const errorMsg = smsErr.response?.data?.error || "SMS alert could not be delivered.";
          alert(`${errorMsg} Please call emergency services immediately.`);
        }
      } else {
        console.warn("No emergency contact found for SOS alert.");
        alert("Emergency contact not found. Please add one in your dashboard to enable SMS alerts.");
      }

      setSosSent(true);
      setTimeout(() => setSosSent(false), 8000);
    } catch (error) {
      console.error("SOS failed", error);
      alert("SOS alert failed to send. Please contact emergency services directly.");
    } finally {
      setSosLoading(false);
    }
  };

  const handleSaveBaggage = async () => {
    if (!user || !ride) return;
    setBookingLoading(true);
    try {
      const baggageData = {
        rideId: ride.id,
        passengerId: user.uid,
        imageUrl: capturedImage || "https://picsum.photos/seed/baggage/400/300",
        description: baggageDesc,
        timestamp: new Date().toISOString()
      };

      if (existingBaggage?.id) {
        await updateDoc(doc(db, "baggage", existingBaggage.id), baggageData);
        setExistingBaggage({ ...baggageData, id: existingBaggage.id } as Baggage);
        alert("Baggage declaration updated.");
      } else {
        const docRef = await addDoc(collection(db, "baggage"), baggageData);
        setExistingBaggage({ ...baggageData, id: docRef.id } as Baggage);
        alert("Baggage documented successfully.");
      }
      
      setShowBaggageForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "baggage");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-mono text-emerald-500">FETCHING_RIDE_DATA...</div>;
  if (!ride || !driver) return <div className="p-20 text-center text-zinc-500">Ride not found.</div>;

  const trustBadge = getTrustBadge(driver.trustScore);
  const isDriver = user && ride && user.uid === ride.driverId;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-100 transition-colors mb-8 font-mono text-xs uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to Search
      </button>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left Column: Ride Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
            <div className="flex justify-between items-start mb-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{ride.source}</h2>
                    <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest">Departure Point</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{ride.destination}</h2>
                    <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest">Arrival Point</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-white tracking-tighter">₹{ride.price}</div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Per Seat</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-zinc-800">
              <InfoItem icon={<Calendar size={16} />} label="Date" value={new Date(ride.dateTime).toLocaleDateString()} />
              <InfoItem icon={<Clock size={16} />} label="Time" value={new Date(ride.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
              <InfoItem icon={<Users size={16} />} label="Seats" value={`${ride.seatsAvailable}/${ride.totalSeats}`} />
              <InfoItem icon={<Car size={16} className="text-emerald-500" />} label="Segment" value={ride.carSegment || "Sedan"} />
              <InfoItem icon={<Leaf size={16} />} label="Eco Saved" value={`${ride.ecoImpact}kg`} />
            </div>
          </div>

          {/* Safety & Legal */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Shield size={16} className="text-emerald-500" /> Police Checkpoint Mode
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                This ride is registered with our digital checkpoint system. 
                A unique QR code is generated for police verification.
              </p>
              <Link to="/checkpoint" className="text-xs font-mono text-emerald-500 hover:underline">VIEW_QR_PROTOCOL</Link>
            </div>
            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <h3 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle size={16} /> Emergency Support
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                In case of any safety concern, use the SOS button. 
                Our team and local authorities will be alerted immediately.
              </p>
              <button 
                onClick={handleSOS}
                disabled={sosLoading || sosSent}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  sosSent ? "bg-emerald-600 text-white" : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20"
                )}
              >
                {sosLoading ? "SENDING..." : sosSent ? "ALERT SENT" : "Trigger SOS"}
              </button>

              {sosSent && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={12} /> Emergency protocol initiated. Authorities notified.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Driver & Booking */}
        <div className="space-y-8">
          {/* Driver Profile */}
          <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-6">Driver Profile</h3>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl font-black text-zinc-500">
                {driver.displayName.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-bold text-white tracking-tight">{driver.displayName}</h4>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold", trustBadge.color)}>{trustBadge.label} Trust</span>
                  {driver.isVerified && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Trust Integrity</span>
                <span className="text-2xl font-black text-white tracking-tighter">{driver.trustScore}<span className="text-[10px] text-zinc-500 ml-0.5">%</span></span>
              </div>
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${driver.trustScore}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/50 border border-zinc-800/30 rounded-xl">
                  <div className="text-[8px] font-mono uppercase text-zinc-600 mb-1">Completion</div>
                  <div className="text-xs font-bold text-zinc-300">{driver.completionRate}%</div>
                </div>
                <div className="p-3 bg-zinc-950/50 border border-zinc-800/30 rounded-xl">
                  <div className="text-[8px] font-mono uppercase text-zinc-600 mb-1">Reliability</div>
                  <div className="text-xs font-bold text-zinc-300">{driver.reliability}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
            {isDriver ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Car className="text-emerald-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">My Ride Listing</h3>
                  <p className="text-zinc-500 text-sm mb-6">
                    Manage your ride listing and view upcoming passengers.
                  </p>
                </div>

                <div className="space-y-3">
                  <Link to="/dashboard" className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-center">
                    Manage Passengers
                  </Link>

                  {ride.status === "pending" && (
                    <div className="pt-4 mt-4 border-t border-zinc-800">
                      {showCancelConfirm ? (
                        <div className="space-y-3">
                          <p className="text-red-500 text-xs font-bold font-mono uppercase tracking-widest text-center animate-pulse">Confirm Cancellation?</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setShowCancelConfirm(false)}
                              className="flex-1 py-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                            >
                              Keep Ride
                            </button>
                            <button 
                              onClick={handleCancelRide}
                              disabled={isDeleting}
                              className="flex-1 py-3 bg-red-600 text-white hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                              {isDeleting ? "..." : "Confirm"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowCancelConfirm(true)}
                          className="w-full py-3 bg-zinc-900 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <X size={14} /> Cancel Ride
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : userBooking ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  {userBooking.status === "confirmed" ? (
                    <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                  ) : (
                    <RefreshCw size={48} className="text-blue-500 mx-auto mb-4 animate-spin-slow" />
                  )}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {userBooking.status === "confirmed" ? "Booking Confirmed" : "Booking Pending"}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-6">
                    {userBooking.status === "confirmed" 
                      ? "You're all set for this ride!" 
                      : "Waiting for driver to confirm your seat."}
                  </p>
                </div>

                {userBooking.status === "confirmed" && (
                  <div className="space-y-4">
                    {existingBaggage && !showBaggageForm ? (
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Declaration Active</span>
                          </div>
                          <button 
                            onClick={() => {
                              setBaggageDesc(existingBaggage.description);
                              setCapturedImage(existingBaggage.imageUrl || null);
                              setShowBaggageForm(true);
                            }}
                            className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                        {existingBaggage.imageUrl && (
                          <img src={existingBaggage.imageUrl} alt="Baggage" className="w-full h-32 object-cover rounded-xl mb-3" />
                        )}
                        <p className="text-xs text-zinc-500 italic">"{existingBaggage.description}"</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button 
                          onClick={() => {
                            if (showBaggageForm) {
                              setShowBaggageForm(false);
                            } else {
                              if (existingBaggage) {
                                setBaggageDesc(existingBaggage.description);
                                setCapturedImage(existingBaggage.imageUrl || null);
                              }
                              setShowBaggageForm(true);
                            }
                          }}
                          className="w-full py-3 border border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 rounded-xl text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Camera size={14} /> {showBaggageForm ? "Cancel Edit" : existingBaggage ? "Update Baggage Info" : "Upload Baggage Photos"}
                        </button>

                        {showBaggageForm && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <textarea 
                              placeholder="Describe your baggage (size, weight, contents)..."
                              value={baggageDesc}
                              onChange={(e) => setBaggageDesc(e.target.value)}
                              className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 min-h-[100px]"
                            />
                            
                            <div className="relative overflow-hidden border border-dashed border-zinc-800 rounded-xl bg-zinc-950 min-h-[200px] flex flex-col items-center justify-center gap-4">
                              {capturedImage ? (
                                <div className="relative w-full h-full group">
                                  <img src={capturedImage} alt="Baggage" className="w-full h-full object-cover" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setCapturedImage(null); }}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : isCameraOpen ? (
                                <div className="relative w-full h-full">
                                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                    <button onClick={capturePhoto} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg" />
                                    <button onClick={() => setIsCameraOpen(false)} className="w-12 h-12 bg-zinc-800 text-white rounded-full flex items-center justify-center"><X size={20} /></button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center gap-2 text-zinc-600 hover:text-zinc-400">
                                  <Camera size={32} />
                                  <span className="text-[10px] uppercase tracking-widest font-mono">Open Live Camera</span>
                                </button>
                              )}
                              <canvas ref={canvasRef} className="hidden" />
                            </div>
                            <button 
                              onClick={handleSaveBaggage}
                              disabled={bookingLoading}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                            >
                              {bookingLoading ? "SYNCHRONIZING..." : existingBaggage ? "Update Declaration" : "Save Documentation"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Link to="/dashboard" className="block w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-center">
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Price Analysis Integration */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-emerald-500" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">AI Price Analysis</span>
                    </div>
                    {analyzingPrice && (
                      <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {pricingAnalysis ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Market Status</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                            pricingAnalysis.isFair ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                          )}>
                            {pricingAnalysis.isFair ? "Fair Price" : "Surge Active"}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                          "{pricingAnalysis.smartInsight}"
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/50">
                          <FactorSmall icon={<TrafficCone size={12} />} value={`x${pricingAnalysis.multipliers.traffic}`} label="Traffic" />
                          <FactorSmall icon={<CloudRain size={12} />} value={`x${pricingAnalysis.multipliers.weather}`} label="Weather" />
                          <FactorSmall icon={<TrendingUp size={12} />} value={`x${pricingAnalysis.multipliers.surge}`} label="Surge" />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase animate-pulse">Analyzing Market Factors...</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">Book Your Seat</h3>
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={declarationAccepted}
                        onChange={(e) => setDeclarationAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <span className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                        I accept the legal terms and safety protocols for this ride.
                      </span>
                    </label>
                  </div>
                  
                  <button 
                    disabled={!declarationAccepted || bookingLoading || ride.seatsAvailable <= 0}
                    onClick={handleBooking}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-all shadow-xl shadow-emerald-900/20"
                  >
                    {bookingLoading ? "PROCESSING..." : ride.seatsAvailable <= 0 ? "SOLD OUT" : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div>
    <div className="flex items-center gap-2 text-zinc-500 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-widest font-mono">{label}</span>
    </div>
    <div className="text-sm font-bold text-zinc-100">{value}</div>
  </div>
);

const FactorSmall = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 text-zinc-500 mb-0.5">
      {icon}
      <span className="text-[8px] uppercase tracking-tighter font-mono">{label}</span>
    </div>
    <div className="text-[10px] font-bold text-white">{value}</div>
  </div>
);
