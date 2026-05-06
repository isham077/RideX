import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Zap, Leaf, Users, ArrowRight, Car } from "lucide-react";

export const Home: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-6">
              <Zap size={14} /> Ride X - AI Carpooling
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
              TRUSTED RIDES.<br />
              <span className="text-zinc-600">SMARTER TRAVEL.</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
              The next generation of carpooling with real-time trust scores, 
              AI-driven pricing, and integrated safety protocols.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
              <div className="w-full sm:w-80 p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-2">Passenger</h3>
                <p className="text-zinc-500 text-sm mb-6">Find trusted rides and save CO2 with our AI-powered carpooling.</p>
                <Link
                  to="/search"
                  className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  Find a Ride <ArrowRight size={16} />
                </Link>
              </div>

              <div className="w-full sm:w-80 p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Car size={80} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Driver</h3>
                <p className="text-zinc-500 text-sm mb-6">Offer your empty seats, earn rewards, and build your trust score.</p>
                <Link
                  to="/offer"
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  Offer a Ride <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-zinc-950/50 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="text-emerald-400" />}
              title="Trust Score AI"
              description="Our algorithm calculates driver reliability using ratings, completion rates, and verification status."
            />
            <FeatureCard
              icon={<Zap className="text-blue-400" />}
              title="Dynamic Pricing"
              description="AI-driven price suggestions based on distance, fuel costs, and demand to keep it fair for everyone."
            />
            <FeatureCard
              icon={<Leaf className="text-emerald-500" />}
              title="Eco Impact"
              description="Track your CO2 savings with every shared ride and earn eco-badges for sustainable travel."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatItem label="Active Users" value="6" />
            <StatItem label="Rides Shared" value="25" />
            <StatItem label="CO2 Saved" value="8.2Kg" />
            <StatItem label="Trust Rating" value="4.9/5" />
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors group">
    <div className="mb-6 p-3 bg-zinc-950 rounded-xl w-fit group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{title}</h3>
    <p className="text-zinc-400 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-4xl font-black text-white mb-2 tracking-tighter">{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</div>
  </div>
);
