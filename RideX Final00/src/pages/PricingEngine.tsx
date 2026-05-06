import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { 
  MapPin, 
  Navigation, 
  Car, 
  CloudRain, 
  TrafficCone, 
  Fuel, 
  TrendingUp, 
  History, 
  ArrowRight, 
  Info, 
  CheckCircle2,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { auth, db } from '../firebase';
import { useAuth } from '../AuthContext';

// Types
interface PriceBreakdown {
  baseFare: number;
  distance: number;
  duration: number;
  traffic: string;
  weather: string;
  fuelPrice: number;
  demandSupplyRatio: number;
  multipliers: {
    traffic: number;
    weather: number;
    surge: number;
    fuel: number;
  };
  finalPrice: number;
  smartInsight?: string;
}

interface RideHistoryItem extends PriceBreakdown {
  id: string;
  pickup: string;
  drop: string;
  vehicleType: string;
  timestamp: any;
}

const VEHICLE_TYPES = [
  { id: 'economy', name: 'Economy', icon: Car, description: 'Affordable everyday rides' },
  { id: 'premium', name: 'Premium', icon: Car, description: 'Comfortable sedans' },
  { id: 'luxury', name: 'Luxury', icon: Car, description: 'High-end luxury vehicles' },
];

export const PricingEngine: React.FC = () => {
  const { firebaseUser: user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [vehicleType, setVehicleType] = useState('economy');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PriceBreakdown | null>(null);
  const [history, setHistory] = useState<RideHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // History Listener
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'rides'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RideHistoryItem[];
      setHistory(rides);
    });

    return () => unsubscribe();
  }, [user]);

  const calculatePrice = async () => {
    if (!pickup || !drop) return;
    
    setCalculating(true);
    setResult(null);

    try {
      const response = await axios.post('/api/calculate-price', {
        pickup,
        drop,
        vehicleType
      });

      const data = response.data;
      setResult({
        ...data,
        smartInsight: "Calculated by Ride X Engine based on real-time traffic and demand factors."
      });

      // Save to Firestore if logged in
      if (user) {
        await addDoc(collection(db, 'rides'), {
          ...data,
          pickup,
          drop,
          vehicleType,
          userId: user.uid,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  const trendData = history
    .filter(ride => ride.timestamp && typeof ride.timestamp.toDate === 'function')
    .slice(0, 7)
    .reverse()
    .map(ride => ({
      time: ride.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: ride.finalPrice
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">SMART PRICING</h1>
          <p className="text-zinc-400">AI-driven fare calculation based on real-time factors.</p>
        </div>
        {user && (
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
          >
            <History size={18} />
            {showHistory ? 'View Calculator' : `Ride History (${history.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Inputs */}
        <div className="space-y-8">
          <form 
            onSubmit={(e) => { e.preventDefault(); calculatePrice(); }}
            className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">Route Details</h2>
            
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-focus-within:bg-emerald-500 group-focus-within:text-white transition-all">
                  <MapPin size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Pickup Location" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-white focus:border-emerald-500 outline-none transition-all"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500/10 text-blue-500 group-focus-within:bg-blue-500 group-focus-within:text-white transition-all">
                  <Navigation size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Drop-off Location" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-white focus:border-emerald-500 outline-none transition-all"
                  value={drop}
                  onChange={(e) => setDrop(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 p-6 rounded-2xl bg-zinc-950/30 border border-zinc-800/50 backdrop-blur-sm shadow-inner">
              <h3 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest">Vehicle Class</h3>
              <div className="grid grid-cols-3 gap-4">
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setVehicleType(type.id)}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group ${
                      vehicleType === type.id 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <div className={cn(
                      "p-3 rounded-xl transition-colors",
                      vehicleType === type.id ? "bg-emerald-500 text-white" : "bg-zinc-900 text-zinc-600 group-hover:text-zinc-400"
                    )}>
                      <type.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">{type.name}</span>
                    {vehicleType === type.id && (
                      <motion.div 
                        layoutId="active-glow-pricing"
                        className="absolute inset-0 opacity-10 bg-gradient-to-br from-emerald-500 to-transparent"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={!pickup || !drop || calculating}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-xl shadow-emerald-900/20 group"
            >
              {calculating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI Analyzing Factors...
                </>
              ) : (
                <>
                  Calculate Smart Fare
                  <div className="p-1.5 bg-white/20 rounded-lg group-hover:translate-x-1 transition-transform">
                    <ArrowRight size={20} />
                  </div>
                </>
              )}
            </button>
          </form>

          {/* Price Trends */}
          {history.length > 1 && !showHistory && (
            <section className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <TrendingUp className="text-emerald-400" />
                  Market Trends
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Last 7 Requests</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderRadius: '16px', border: '1px solid #27272a', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#71717a' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#10b981" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Results & History */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {result && !showHistory ? (
              <motion.section 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-10 rounded-[40px] bg-zinc-950 border border-zinc-800 overflow-hidden relative shadow-2xl"
              >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[120px] -mr-40 -mt-40 rounded-full" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <p className="text-emerald-500 text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-3">AI Estimated Fare</p>
                      <h2 className="text-7xl font-black text-white tracking-tighter">${result.finalPrice.toFixed(2)}</h2>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20">
                      <Car className="w-10 h-10 text-emerald-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-12">
                    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
                      <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">
                        <Navigation size={14} />
                        Distance
                      </div>
                      <p className="text-2xl font-black text-white">{result.distance} km</p>
                    </div>
                    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
                      <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">
                        <History size={14} />
                        Est. Time
                      </div>
                      <p className="text-2xl font-black text-white">{result.duration}m</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.3em]">AI Insight & Factor Analysis</h3>
                    
                    {/* Smart Insight */}
                    {result.smartInsight && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Bot size={20} className="text-emerald-500" />
                        </div>
                        <p className="text-xs text-emerald-200/70 italic leading-relaxed">
                          "{result.smartInsight}"
                        </p>
                      </motion.div>
                    )}

                    <div className="space-y-4">
                      <FactorRow label="Base Fare" value={`$${result.baseFare.toFixed(2)}`} />
                      <FactorRow 
                        label={`Traffic (${result.traffic})`} 
                        value={`x${result.multipliers.traffic}`} 
                        icon={<TrafficCone size={16} className="text-orange-400" />}
                        highlight="text-orange-400"
                      />
                      <FactorRow 
                        label={`Weather (${result.weather})`} 
                        value={`x${result.multipliers.weather}`} 
                        icon={<CloudRain size={16} className="text-blue-400" />}
                        highlight="text-blue-400"
                      />
                      <FactorRow 
                        label="Surge Pricing" 
                        value={`x${result.multipliers.surge}`} 
                        icon={<TrendingUp size={16} className="text-purple-400" />}
                        highlight="text-purple-400"
                      />
                      <FactorRow 
                        label={`Fuel Adj ($${result.fuelPrice}/L)`} 
                        value={`x${result.multipliers.fuel}`} 
                        icon={<Fuel size={16} className="text-emerald-400" />}
                        highlight="text-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-zinc-900 flex items-start gap-4 text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tight">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    Prices are calculated dynamically using real-time traffic, weather, and demand data. Final fare may vary.
                  </div>
                </div>
              </motion.section>
            ) : showHistory ? (
              <motion.section 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 rounded-[40px] bg-zinc-950 border border-zinc-800 h-full flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-white tracking-tighter">RIDE HISTORY</h2>
                  <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600 italic">
                      <History size={48} className="mb-6 opacity-10" />
                      No history found
                    </div>
                  ) : (
                    history.map((ride) => (
                      <div key={ride.id} className="p-6 rounded-3xl border border-zinc-900 bg-zinc-900/30 hover:border-emerald-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                              <Car size={16} className="text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-widest">{ride.vehicleType}</span>
                          </div>
                          <span className="text-2xl font-black text-white">${ride.finalPrice.toFixed(2)}</span>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="truncate text-zinc-400">{ride.pickup}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <span className="truncate text-zinc-400">{ride.drop}</span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-600 font-mono uppercase">
                          <span>{ride.timestamp?.toDate().toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5 text-emerald-500/70">
                            <CheckCircle2 size={12} />
                            Calculated
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 rounded-[40px] bg-zinc-900/30 border border-zinc-800 border-dashed flex flex-col items-center justify-center text-center space-y-8 min-h-[500px]"
              >
                <div className="w-32 h-32 bg-emerald-500/5 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full animate-pulse" />
                  <Navigation size={48} className="text-emerald-500 relative z-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-3 tracking-tighter">READY TO CALCULATE?</h3>
                  <p className="text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Input your route details to see our AI pricing model in action.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
                  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                    <TrafficCone size={16} />
                    Traffic
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                    <CloudRain size={16} />
                    Weather
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const FactorRow = ({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: string }) => (
  <div className="flex justify-between items-center py-1">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm text-zinc-400">{label}</span>
    </div>
    <span className={`text-sm font-bold ${highlight || 'text-white'}`}>{value}</span>
  </div>
);

const X = ({ size, className }: { size?: number; className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
