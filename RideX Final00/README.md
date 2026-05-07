# RideX Core System

An intelligent, AI-driven carpooling architecture designed to optimize ride-sharing logistics through dynamic pricing, real-time trust scoring, and a conversational interface.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)

## Architecture Overview

RideX is built on a serverless React/Vite frontend interacting directly with Firebase via heavily restricted Firestore Security Rules. The system abstracts complex logistics into natural language queries and dynamic ML algorithms.

### Core Modules

* **AI Conversational Interface (RideAI):** 
  Integrated with the Groq API, the LLM intercepts user queries, translates them into structured Firestore queries via tool calling, and formats the output into human-readable data.
* **Dynamic Pricing Engine:** 
  A custom gradient boosting model that calculates real-time fare estimates by evaluating matrix factors including route distance, vehicle segment tier, and simulated market demand.
* **Checkpoint Manifest System:** 
  A bypass architecture for strict Firestore rules. It aggregates protected sub-collection data (bookings, baggage images) into a localized public manifest snapshot upon driver request, generating a scannable QR payload for frictionless law enforcement verification.
* **Twilio SOS Protocol:** 
  Event-driven emergency broadcasting system that interfaces with device geolocation APIs to dispatch immediate SMS payloads to administrative and emergency contacts.

## System Configuration

The platform requires the following environment variables to instantiate core services:

| Environment Variable | Description |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase initialization and auth gateway |
| `GROQ_API_KEY` | Authentication for the LLM processing pipeline |
| `TWILIO_ACCOUNT_SID` | Twilio REST API Account Identifier |
| `TWILIO_AUTH_TOKEN` | Twilio REST API Authorization Token |

## Quick Start

Assuming a standard Node.js (v18+) environment:

```bash
npm install
npm run dev
```

## Security Posture

- **Data Access:** Enforced exclusively at the database layer via `firestore.rules`.
- **Manifest Bypass:** The police verification endpoint utilizes a controlled, read-only snapshot mechanism, ensuring that active bookings and user PI remain completely isolated from public unauthenticated queries.

---
*Maintained by [isham077](https://github.com/isham077)*
