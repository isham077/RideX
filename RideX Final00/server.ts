import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import axios from "axios";

// Load Firebase config safely in ESM
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase for server-side use
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Constants for pricing algorithm
const BASE_RATE_PER_KM = 10; // Base rate in local currency
const TRAFFIC_MULTIPLIERS = {
  clear: 1.0,
  moderate: 1.2,
  heavy: 1.5,
};
const WEATHER_MULTIPLIERS: Record<string, number> = {
  clear: 1.0,
  rain: 1.2,
  storm: 1.5,
  heat: 1.1,
};
const VEHICLE_MULTIPLIERS = {
  economy: 1.0,
  premium: 1.5,
  luxury: 2.5,
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Chat with Groq
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, tools } = req.body;
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GROQ_API_KEY is not set on the server." });
      }

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages,
          tools,
          tool_choice: tools ? "auto" : undefined,
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Groq API error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error?.message || "Failed to call Groq API",
      });
    }
  });

  // API Route: Calculate Price
  app.post("/api/calculate-price", async (req, res) => {
    try {
      const { pickup, drop, vehicleType = "economy" } = req.body;

      if (!pickup || !drop) {
        return res.status(400).json({ error: "Pickup and drop locations are required." });
      }

      // 1. Mock Distance & Duration (In real app, use Google Maps API)
      // For this demo, we'll generate random but plausible values
      const distance = Math.floor(Math.random() * 20) + 5; // 5-25 km
      const duration = Math.floor(distance * 2.5); // ~2.5 mins per km

      // 2. Mock Traffic Conditions
      const trafficOptions = ["clear", "moderate", "heavy"] as const;
      const traffic = trafficOptions[Math.floor(Math.random() * trafficOptions.length)];

      // 3. Mock Weather Conditions
      const weatherOptions = ["clear", "rain", "storm", "heat"] as const;
      const weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];

      // 4. Mock Fuel Price (In real app, fetch from fuel API)
      const fuelPrice = 105.5; // Example price per liter

      // 5. Mock Demand & Supply
      const demand = Math.floor(Math.random() * 100) + 50;
      const supply = Math.floor(Math.random() * 80) + 20;

      // --- PRICING ALGORITHM ---
      
      // Base Fare = Distance × Rate per km × Vehicle Multiplier
      const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType as keyof typeof VEHICLE_MULTIPLIERS] || 1.0;
      const baseFare = distance * BASE_RATE_PER_KM * vehicleMultiplier;

      // Multipliers
      const trafficMultiplier = TRAFFIC_MULTIPLIERS[traffic];
      const weatherMultiplier = WEATHER_MULTIPLIERS[weather] || 1.0;
      
      // Surge Pricing based on Demand/Supply ratio
      let surgeMultiplier = 1.0;
      const demandSupplyRatio = demand / supply;
      if (demandSupplyRatio > 1.5) surgeMultiplier = 1.2;
      if (demandSupplyRatio > 2.0) surgeMultiplier = 1.5;
      if (demandSupplyRatio > 3.0) surgeMultiplier = 2.0;

      // Fuel Adjustment (Small factor based on deviation from base fuel price of 100)
      const fuelAdjustment = 1 + (fuelPrice - 100) / 500; // e.g., 105.5 -> 1.011

      // Final Price Calculation
      const finalPrice = baseFare * trafficMultiplier * weatherMultiplier * surgeMultiplier * fuelAdjustment;

      const breakdown = {
        baseFare: Math.round(baseFare * 100) / 100,
        distance,
        duration,
        traffic,
        weather,
        fuelPrice,
        demandSupplyRatio: Math.round(demandSupplyRatio * 100) / 100,
        multipliers: {
          traffic: trafficMultiplier,
          weather: weatherMultiplier,
          surge: surgeMultiplier,
          fuel: Math.round(fuelAdjustment * 1000) / 1000,
        },
        finalPrice: Math.round(finalPrice * 100) / 100,
      };

      res.json(breakdown);
    } catch (error) {
      console.error("Pricing calculation error:", error);
      res.status(500).json({ error: "Failed to calculate price." });
    }
  });
  
  // API Route: Send SOS SMS
  app.post("/api/send-sos", async (req, res) => {
    try {
      const { phone, message, userId } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ error: "Phone and message are required." });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!fromPhone) {
        return res.status(500).json({ error: "TWILIO_PHONE_NUMBER is not set on the server." });
      }


      // CRITICAL: Check if to and from numbers are the same
      if (phone === fromPhone) {
        console.error(`[SOS ERROR] To and From numbers are the same: ${phone}. Twilio will reject this.`);
        return res.status(400).json({ 
          error: "Emergency contact number cannot be the same as the system sender number.",
          details: "Please use a different phone number for your emergency contact."
        });
      }

      if (!accountSid || !authToken) {
        console.warn("Twilio credentials missing. Logging SOS instead.");
        console.log(`[SOS LOG] TWILIO_CREDENTIALS_MISSING | To: ${phone} | From: ${fromPhone} | Msg: ${message}`);
        return res.json({ 
          success: true, 
          status: "logged", 
          info: "Twilio credentials missing. The SOS was logged on the server. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment." 
        });
      }

      console.log(`[SOS ATTEMPT] Sending SMS from ${fromPhone} to emergency contact ${phone}`);

      // Using Twilio API via axios
      const params = new URLSearchParams();
      params.append("To", phone);
      params.append("From", fromPhone);
      params.append("Body", message);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
        }
      );

      res.json({ success: true, sid: response.data.sid });
    } catch (error: any) {
      console.error("Twilio SMS error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to send SMS alert." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
