import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthButton } from "./AuthButton";
import { NotificationBell } from "./NotificationBell";
import { ChatBot } from "./ChatBot";
import { Car, Search, LayoutDashboard, Shield, MapPin, Menu, X, TrendingUp } from "lucide-react";
import { useAuth } from "../AuthContext";
import { cn } from "../lib/utils";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navItems = [
    { label: "Find Rides", path: "/search", icon: Search, show: true },
    { label: "Offer Ride", path: "/offer", icon: Car, show: user?.role === "driver" },
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, show: !!user },
    { label: "Checkpoint", path: "/checkpoint", icon: Shield, show: user?.role === "driver" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-1.5 bg-emerald-500 rounded-lg group-hover:rotate-12 transition-transform">
                <Car className="text-black" size={20} />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                RIDE X
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    location.pathname === item.path
                      ? "bg-zinc-900 text-emerald-400"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
              <div className="ml-4 pl-4 border-l border-zinc-800 flex items-center gap-3">
                {user && <NotificationBell />}
                <AuthButton />
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-zinc-400"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-zinc-950 border-b border-zinc-900 px-4 py-4 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col gap-2">
              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3",
                    location.pathname === item.path
                      ? "bg-zinc-900 text-emerald-400"
                      : "text-zinc-400"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center gap-3">
                {user && <NotificationBell />}
                <AuthButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-left">
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">Platform</h4>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li>Safety Features</li>
                <li>Trust Score</li>
                <li>AI Pricing</li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">Legal</h4>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
                <li>Police Checkpoint</li>
              </ul>
            </div>
          </div>
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-tighter">
            © 2026 RIDE X • ACADEMIC PROJECT • SECURE & TRUSTED
          </p>
        </div>
      </footer>

      {/* Floating ChatBot */}
      <ChatBot />
    </div>
  );
};
