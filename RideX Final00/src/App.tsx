import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { OfferRide } from "./pages/OfferRide";
import { Dashboard } from "./pages/Dashboard";
import { Checkpoint } from "./pages/Checkpoint";
import { RideDetails } from "./pages/RideDetails";
import { PublicRideInfo } from "./pages/PublicRideInfo";
import { PricingEngine } from "./pages/PricingEngine";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/offer" element={<OfferRide />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/checkpoint" element={<Checkpoint />} />
            <Route path="/ride/:id" element={<RideDetails />} />
            <Route path="/ride-info/:id" element={<PublicRideInfo />} />
            <Route path="/pricing" element={<PricingEngine />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
