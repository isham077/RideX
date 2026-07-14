# RideX

An AI-assisted carpooling platform with conversational ride search, rule-based dynamic pricing, a driver trust-score system, and an emergency SOS alert flow — built with React, Firebase, and the Groq LLM API.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_API-0F1419?style=flat-square&logo=groq&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Server API](#server-api)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

RideX is a carpooling platform where riders can search for and book rides using natural-language chat (powered by the Groq API), drivers get a trust score based on their ride history, and every ride includes an SOS button that sends an emergency SMS with the user's live location via Twilio. A "Checkpoint" mode lets drivers generate a shareable, PII-safe manifest of a ride's bookings for roadside verification (e.g. at a police checkpoint).

### Key Features

- **Conversational ride search** — a chat interface (`ChatBot.tsx`) sends user messages to a Groq-hosted LLM (`llama-3.1-8b-instant`) with tool definitions, letting users search and filter rides in plain language instead of using search forms.
- **Rule-based dynamic pricing** — fares are computed server-side from a transparent formula combining distance, vehicle tier, simulated traffic/weather/demand multipliers, and fuel price (see [`server.ts`](./RideX%20Final00/server.ts)). This is a deterministic pricing formula, not a trained ML model.
- **Driver trust score** — a weighted score (`rating × 0.5 + completionRate × 0.3 + reliability × 0.2`) computed from ride history and updated after each completed ride and rating.
- **Checkpoint mode** — generates a read-only, PII-scrubbed snapshot of a ride's bookings for verification purposes, without exposing the full protected Firestore collections.
- **SOS alerts** — one-tap emergency SMS via Twilio, including the sender's location, to a saved emergency contact.

## Architecture

The frontend is a Vite + React 19 SPA that talks to Firebase (Auth + Firestore) directly for most data operations, governed by Firestore Security Rules. A small Express server (run via `tsx server.ts`) sits alongside Vite in development and serves three endpoints that need to keep API keys off the client: chat completion (Groq), price calculation, and SOS SMS dispatch (Twilio).

```
┌─────────────────────────────────────────────────────────────┐
│                       RideX Frontend                        │
│               (React 19 + Vite + TypeScript)                │
└──────────┬─────────────────────────────────┬────────────────┘
           │                                 │
     Firebase SDK                      Express server
   (Auth, Firestore)                (/api/chat, /api/calculate-price,
           │                          /api/send-sos)
           │                                 │
     ┌─────▼─────┐                    ┌──────┴──────┐
     │ Firestore │                    │ Groq / Twilio│
     └───────────┘                    └─────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Routing | React Router v7 |
| Dev/prod server | Express (serves Vite in dev, static build in prod) |
| Backend data | Firebase Auth, Firestore |
| Conversational AI | Groq API (`llama-3.1-8b-instant`) |
| Notifications | Twilio SMS |
| Charts/UI | Recharts, Framer Motion, Lucide icons |

## Project Structure

```
RideX/
├── LICENSE
├── README.md
└── RideX Final00/                 # application source
    ├── server.ts                  # Express server: /api/chat, /api/calculate-price, /api/send-sos
    ├── firebase-applet-config.json
    ├── firestore.rules
    ├── vite.config.ts
    ├── src/
    │   ├── main.tsx               # app entry point
    │   ├── App.tsx                # routes
    │   ├── AuthContext.tsx        # Firebase auth context/provider
    │   ├── firebase.ts            # Firebase client init
    │   ├── types.ts               # shared TypeScript types
    │   ├── components/            # ChatBot, AuthButton, Layout, NotificationBell, RatingModal
    │   ├── pages/                 # Home, Search, RideDetails, OfferRide, DriverDashboard,
    │   │                          # PassengerDashboard, Checkpoint, PublicRideInfo, Dashboard,
    │   │                          # PricingEngine
    │   ├── services/              # firestoreUtils, geoService, notificationService, rideService
    │   └── lib/                   # utils.ts
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Firebase project (Auth + Firestore enabled)
- API keys for Groq and Twilio if you want chat and SOS features to work end-to-end

### Installation

```bash
git clone https://github.com/isham077/RideX.git
cd "RideX/RideX Final00"
npm install
```

Create a `.env` file in `RideX Final00/` (see [Environment Variables](#environment-variables)), then start the server:

```bash
npm run dev
```

The app is served at **http://localhost:3000** (the Express server, not Vite's default 5173 — Vite runs in middleware mode behind Express here).

## Environment Variables

| Variable | Used for | Required |
|---|---|---|
| `GROQ_API_KEY` | Server-side calls to the Groq chat completion API | For chat search |
| `TWILIO_ACCOUNT_SID` | Twilio REST API auth | For SOS SMS |
| `TWILIO_AUTH_TOKEN` | Twilio REST API auth | For SOS SMS |
| `TWILIO_PHONE_NUMBER` | The Twilio number SOS messages are sent from (E.164 format) | For SOS SMS |

Firebase client configuration lives in `firebase-applet-config.json` (this holds the public Firebase web config, which is safe to expose — access is controlled by `firestore.rules`, not by hiding this file).

The app continues to run even when the Groq/Twilio environment variables aren't configured. In that case, the chat and SOS endpoints return clear error messages and logs instead of failing silently.

## Available Scripts

Run from inside `RideX Final00/`:

```bash
npm run dev       # Start the Express + Vite dev server on :3000
npm run build     # Production build (vite build)
npm run preview   # Preview the production build
npm run lint      # Type-check the project (tsc --noEmit)
npm run clean     # Remove the dist/ folder
```

## Server API

Endpoints implemented in [`server.ts`](./RideX%20Final00/server.ts):

- `POST /api/chat` — proxies a chat completion request to the Groq API using the server-side `GROQ_API_KEY`.
- `POST /api/calculate-price` — computes a fare estimate from `{ pickup, drop, vehicleType }` using the deterministic pricing formula described above.
- `POST /api/send-sos` — sends an emergency SMS via Twilio to `{ phone, message }`; logs instead of sending if Twilio credentials aren't configured.

## Security Notes

- Firestore access is governed by `firestore.rules`; the Firebase web config in `firebase-applet-config.json` is a public client key by design, not a secret.
- Server-side secrets (`GROQ_API_KEY`, Twilio credentials/number) are read from environment variables and are never sent to the client.
- The Checkpoint manifest feature is designed to expose only the minimum data needed for ride verification, keeping full booking records and PII in protected Firestore paths.

## Roadmap

- Develop native mobile applications using React Native
- Launch a comprehensive driver analytics dashboard
- Introduce scheduled and recurring ride bookings
- Add social ride-sharing features, including friend invitations and shared trips

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with a clear message
4. Push to your fork and open a Pull Request describing what changed and why

## License

MIT — see [LICENSE](./LICENSE).

---

**Maintained by:** [@isham077](https://github.com/isham077)
