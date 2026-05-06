import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Ride, User } from "../types";
import { useAuth } from "../AuthContext";
import { Search as SearchIcon, MapPin, Calendar, Users, ArrowRight, ShieldCheck, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { getTrustBadge } from "../services/rideService";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { autocomplete, getCurrentLocation, geocode } from "../services/geoService";

export const Search: React.FC = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<{ [key: string]: User }>({});
  const [segmentFilter, setSegmentFilter] = useState<string>("All");

  // Autocomplete for source
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (source.length > 3) {
        const suggestions = await autocomplete(source);
        setSourceSuggestions(suggestions);
      } else {
        setSourceSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [source]);

  // Autocomplete for destination
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destination.length > 3) {
        const suggestions = await autocomplete(destination);
        setDestSuggestions(suggestions);
      } else {
        setDestSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [destination]);

  const handleUseCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      // For simplicity in a demo, we'll just set it to "Current Location" 
      // or try to reverse geocode if we had that function.
      // Let's just set a placeholder for now.
      setSource("Current Location");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      let q = query(collection(db, "rides"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
      
      const querySnapshot = await getDocs(q);
      const allRides = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ride));
      
      // Client-side filtering for demo simplicity (Firestore requires composite indexes for multiple where + orderby)
      const filteredRides = allRides.filter(ride => 
        (!source || ride.source.toLowerCase().includes(source.toLowerCase())) &&
        (!destination || ride.destination.toLowerCase().includes(destination.toLowerCase())) &&
        (segmentFilter === "All" || ride.carSegment === segmentFilter)
      );

      setRides(filteredRides);

      // Fetch driver info for these rides
      const driverIds = [...new Set(filteredRides.map(r => r.driverId))];
      const driverData: { [key: string]: User } = {};
      for (const dId of driverIds) {
        const uDoc = await getDoc(doc(db, "users", dId));
        if (uDoc.exists()) {
          driverData[dId] = uDoc.data() as User;
        }
      }
      setDrivers(driverData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "rides");
    } finally {
      setLoading(false);
    }
  };

  const { isAuthReady, firebaseUser } = useAuth();

  useEffect(() => {
    // Only search automatically if auth is ready.
    // If not logged in, we can still search because we updated rules to allow public list of pending rides.
    if (isAuthReady) {
      handleSearch();
    }
  }, [isAuthReady, segmentFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Find Your Next Ride</h1>
        <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Secure • Trusted • Affordable</p>
      </div>

      {/* Search Bar */}
      <div className="space-y-6 mb-12">
        <form onSubmit={handleSearch} className="grid md:grid-cols-3 gap-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="From (Source)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100"
          />
          <button 
            type="button"
            onClick={handleUseCurrentLocation}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-500 transition-colors"
            title="Use current location"
          >
            <Navigation size={16} />
          </button>
          {sourceSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-50 shadow-2xl">
              {sourceSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSource(s); setSourceSuggestions([]); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 text-zinc-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="To (Destination)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-zinc-100"
          />
          {destSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-50 shadow-2xl">
              {destSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setDestination(s); setDestSuggestions([]); }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 text-zinc-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <SearchIcon size={20} />
          Search
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mr-2">Filter by Segment:</span>
          {["All", "Sedan", "SUV", "MPV"].map((seg) => (
            <button
              key={seg}
              onClick={() => setSegmentFilter(seg)}
              className={`px-4 py-2 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all ${
                segmentFilter === seg
                  ? "bg-zinc-100 border-zinc-100 text-black"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-pulse" />
          ))
        ) : rides.length > 0 ? (
          rides.map((ride) => {
            const driver = drivers[ride.driverId];
            const badge = driver ? getTrustBadge(driver.trustScore) : null;
            
            return (
              <Link
                key={ride.id}
                to={`/ride/${ride.id}`}
                className="group p-6 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-white tracking-tight">₹{ride.price}</div>
                    <div className="flex items-center gap-2">
                       <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Per Seat</div>
                       <div className="w-1 h-1 rounded-full bg-zinc-800" />
                       <div className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest font-bold">{ride.carSegment}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-zinc-400 text-sm">
                      <Users size={14} />
                      <span>{ride.seatsAvailable} Left</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-1">
                      {ride.totalSeats} Total
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-100 font-medium truncate">{ride.source}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-zinc-100 font-medium truncate">{ride.destination}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                      {driver?.displayName?.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-100">{driver?.displayName}</span>
                      {badge && (
                        <span className={`text-[10px] font-mono uppercase tracking-widest ${badge.color}`}>
                          {badge.label} Trust
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="text-zinc-500 mb-2">No rides found matching your criteria.</div>
            <div className="text-zinc-700 text-sm font-mono uppercase tracking-widest">Try a different search</div>
          </div>
        )}
      </div>
    </div>
  );
};
