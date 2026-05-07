import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { MapPin, Calendar, Clock, Users, IndianRupee, Zap, ArrowRight, ShieldCheck, Info, Navigation } from "lucide-react";
import { CarSegment } from "../types";
import { calculateRecommendedPrice, calculateEcoImpact } from "../services/rideService";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { geocode, calculateDistance, autocomplete, getCurrentLocation } from "../services/geoService";

export const OfferRide: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    source: "",
    destination: "",
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    seats: 3,
    distance: 0,
    price: 0,
    carSegment: "Sedan" as CarSegment,
  });

  const [recommendedPrice, setRecommendedPrice] = useState(0);

  // Autocomplete for source
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.source.length > 3) {
        const suggestions = await autocomplete(formData.source);
        setSourceSuggestions(suggestions);
      } else {
        setSourceSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.source]);

  // Autocomplete for destination
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.destination.length > 3) {
        const suggestions = await autocomplete(formData.destination);
        setDestSuggestions(suggestions);
      } else {
        setDestSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.destination]);

  const handleUseCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      setFormData(prev => ({ ...prev, source: "Current Location" }));
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-calculate distance when both source and destination are present
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.source.length > 3 && formData.destination.length > 3 && formData.source !== "Current Location") {
        setGeoLoading(true);
        try {
          const startCoords = await geocode(formData.source);
          const endCoords = await geocode(formData.destination);
          
          if (startCoords && endCoords) {
            const dist = await calculateDistance(startCoords, endCoords);
            if (dist) {
              setFormData(prev => ({ ...prev, distance: dist }));
            }
          }
        } catch (err) {
          console.error("Auto-geo failed", err);
        } finally {
          setGeoLoading(false);
        }
      }
    }, 1500); // Debounce

    return () => clearTimeout(timer);
  }, [formData.source, formData.destination]);

  useEffect(() => {
    if (formData.distance > 0) {
      const price = calculateRecommendedPrice(formData.distance);
      setRecommendedPrice(price);
      setFormData(prev => ({ ...prev, price }));
    }
  }, [formData.distance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to publish a ride.");
      return;
    }
    setLoading(true);

    try {
      const rideData = {
        driverId: user.uid,
        source: formData.source,
        destination: formData.destination,
        dateTime: `${formData.date}T${formData.time}`,
        seatsAvailable: formData.seats,
        totalSeats: formData.seats,
        carSegment: formData.carSegment,
        price: formData.price,
        distance: formData.distance,
        status: "pending",
        ecoImpact: calculateEcoImpact(formData.distance),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "rides"), rideData);
      
      // Update user role if not already driver (for demo)
      if (user.role !== "driver") {
        await updateDoc(doc(db, "users", user.uid), { role: "driver" });
      }

      navigate(`/ride/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "rides");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Offer a Ride</h1>
        <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Set your route • Set your price • Save CO2</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Route Section */}
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="text-emerald-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">Route Details</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Source</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="Starting Point"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100 pr-10"
                />
                <button 
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-500 transition-colors"
                  title="Use current location"
                >
                  <Navigation size={16} />
                </button>
              </div>
              {sourceSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-50 shadow-2xl">
                  {sourceSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setFormData({ ...formData, source: s }); setSourceSuggestions([]); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 text-zinc-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 relative">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Destination</label>
              <input
                required
                type="text"
                placeholder="End Point"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100"
              />
              {destSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-50 shadow-2xl">
                  {destSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setFormData({ ...formData, destination: s }); setDestSuggestions([]); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 text-zinc-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Estimated Distance (km) {geoLoading && <span className="text-emerald-500 animate-pulse ml-2">CALCULATING...</span>}
            </label>
            <input
              required
              type="number"
              placeholder="Enter distance"
              value={formData.distance || ""}
              onChange={(e) => setFormData({ ...formData, distance: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100"
            />
          </div>
        </div>

        {/* Schedule & Seats */}
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">Schedule & Capacity</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Date</label>
              <input
                required
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100 appearance-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Time</label>
              <input
                required
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100 appearance-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Seats Available</label>
              <select
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100"
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Seats</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Vehicle Segment</label>
            <div className="flex gap-3">
              {["Sedan", "SUV", "MPV"].map((segment) => (
                <button
                  key={segment}
                  type="button"
                  onClick={() => setFormData({ ...formData, carSegment: segment as any })}
                  className={`flex-1 py-4 px-6 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${
                    formData.carSegment === segment
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {segment}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest italic">
              * Choose the segment that best describes your vehicle for passenger clarity.
            </p>
          </div>
        </div>

        {/* AI Pricing Section */}
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={80} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-emerald-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">AI Pricing Suggestion</h2>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex items-start gap-3 mb-6">
            <Info className="text-emerald-500 shrink-0" size={18} />
            <p className="text-sm text-emerald-400/80 leading-relaxed">
              Based on your {formData.distance}km route, our AI suggests a price of 
              <span className="text-white font-bold mx-1">₹{recommendedPrice}</span> 
              to maximize your chances of finding passengers while covering costs.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Your Price (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                required
                type="number"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100 text-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* Legal Declaration */}
        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input required type="checkbox" className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
              I hereby declare that I hold a valid driving license and vehicle insurance. 
              I agree to follow all traffic safety protocols and the platform's code of conduct.
            </span>
          </label>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20"
        >
          {loading ? "CREATING_RIDE..." : "Publish Ride"}
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};
