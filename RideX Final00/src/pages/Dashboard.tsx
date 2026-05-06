import React from "react";
import { useAuth } from "../AuthContext";
import { DriverDashboard } from "./DriverDashboard";
import { PassengerDashboard } from "./PassengerDashboard";

export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-64 bg-zinc-900 rounded-3xl mb-12" />
        <div className="grid md:grid-cols-2 gap-12">
          <div className="h-96 bg-zinc-900 rounded-3xl" />
          <div className="h-96 bg-zinc-900 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return user.role === "driver" ? <DriverDashboard /> : <PassengerDashboard />;
};
