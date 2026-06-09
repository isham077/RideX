# RideX Core System

An intelligent, AI-driven carpooling architecture designed to optimize ride-sharing logistics through dynamic pricing, real-time trust scoring, and a conversational interface.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_API-0F1419?style=flat-square&logo=groq&logoColor=white)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture-overview)
- [Core Modules](#core-modules)
- [Tech Stack](#tech-stack)
- [System Configuration](#system-configuration)
- [Quick Start](#quick-start)
- [Security Posture](#security-posture)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview

RideX is a next-generation AI-powered carpooling platform that revolutionizes ride-sharing through intelligent algorithms and real-time decision making. The system combines a conversational AI interface with sophisticated backend logistics to deliver seamless, secure, and cost-effective ride-sharing experiences.

**Key Features:**
- 🤖 **AI-Driven Matching:** Natural language queries processed by Groq LLM for intelligent ride matching
- 💰 **Dynamic Pricing:** Real-time fare calculation based on demand, distance, and vehicle class
- 🔐 **Trust Scoring:** Real-time verification and user trust metrics
- 📍 **Geolocation Integration:** Real-time GPS tracking with emergency protocols
- 🚨 **SOS Protocol:** Integrated emergency response system via Twilio

## Architecture Overview

RideX is built on a serverless React/Vite frontend interacting directly with Firebase via heavily restricted Firestore Security Rules. The system abstracts complex logistics into natural language queries, enabling users to interact with sophisticated backend systems through conversational AI.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     RideX Frontend                          │
│              (React 19 + Vite + TypeScript)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST API
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼──┐      ┌────▼──┐      ┌────▼──┐
    │ Groq  │      │Firebase│      │Twilio │
    │ LLM   │      │ Backend │      │ SOS   │
    └──────┘      └────────┘      └──────┘
```

### Core Modules

* **AI Conversational Interface (RideAI):** 
  Integrated with the Groq API, the LLM intercepts user queries, translates them into structured Firestore queries via tool calling, and formats the output into human-readable data. Supports natural language requests like "Show me rides to downtown" or "Find carpools leaving at 5 PM."

* **Dynamic Pricing Engine:** 
  A custom gradient boosting model that calculates real-time fare estimates by evaluating multiple factors including:
  - Route distance and complexity
  - Vehicle segment tier (economy, premium, luxury)
  - Simulated market demand
  - Time-of-day multipliers
  - Driver rating adjustments

* **Checkpoint Manifest System:** 
  A bypass architecture for strict Firestore rules that aggregates protected sub-collection data (bookings, baggage images) into a localized public manifest snapshot upon driver request. Generates secure verification tokens for law enforcement with zero exposure to active PII.

* **Twilio SOS Protocol:** 
  Event-driven emergency broadcasting system that interfaces with device geolocation APIs to dispatch immediate SMS payloads to administrative and emergency contacts. Provides one-click emergency alerting with location sharing.

* **Real-Time Trust Scoring:** 
  Machine learning-based user verification system that evaluates:
  - Ride completion history
  - User ratings and reviews
  - Payment history
  - Behavior patterns
  - Report/complaint metrics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **State Management** | React Context API / Zustand |
| **Backend** | Firebase Cloud Functions, Firestore |
| **Authentication** | Firebase Auth |
| **Database** | Firestore (NoSQL) |
| **AI/ML** | Groq LLM API, Custom ML Models |
| **Communications** | Twilio SMS/Voice, WebSockets |
| **Geolocation** | Browser Geolocation API, Google Maps API |
| **DevOps** | Vite Build System, Firebase Hosting |

## System Configuration

The platform requires the following environment variables to instantiate core services:

| Environment Variable | Description | Required |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase initialization and auth gateway | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `GROQ_API_KEY` | Authentication for the LLM processing pipeline | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio REST API Account Identifier | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio REST API Authorization Token | ✅ |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for SMS dispatch | ✅ |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API for routing and geocoding | ✅ |

### Environment Setup

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
GROQ_API_KEY=your_groq_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Quick Start

### Prerequisites
- Node.js v18 or higher
- npm or yarn package manager
- Git

### Installation

Assuming a standard Node.js (v18+) environment:

```bash
# Clone the repository
git clone https://github.com/isham077/RideX.git
cd RideX/RideX\ Final00

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The application will be available at `http://localhost:5173`

## Project Structure

```
RideX Final00/
├── src/
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # Firebase and API services
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── styles/           # Global styles
│   └── main.tsx          # Application entry point
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── firebase-applet-config.json  # Firebase configuration
├── tailwind.config.js    # TailwindCSS configuration
└── package.json          # Project dependencies
```

## Security Posture

### Data Access
- **Firestore Security Rules:** Enforced exclusively at the database layer via `firestore.rules`
- **Row-Level Security:** User data isolated per authenticated account
- **API Key Protection:** Environment variables never committed to repository

### Authentication & Authorization
- **Firebase Auth:** Secure user authentication with multi-factor support
- **Token Management:** JWT tokens with automatic refresh
- **Role-Based Access:** Driver, passenger, and admin privilege levels

### Manifest Bypass Security
The police verification endpoint utilizes a controlled, read-only snapshot mechanism, ensuring that:
- Active bookings remain completely isolated
- User Personally Identifiable Information (PII) is protected
- Public unauthenticated access is strictly prevented
- Audit trails log all verification requests

### Data Encryption
- **In Transit:** All API calls use HTTPS/TLS encryption
- **At Rest:** Firebase encryption by default
- **PII Masking:** Sensitive user data masked in logs and reports

### Third-Party Security
- **Groq API:** Secure LLM processing with encrypted requests/responses
- **Twilio:** HIPAA-compliant communications platform
- **Firebase:** SOC 2 Type II certified infrastructure

## Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Production build
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
npm run lint         # Run linting checks

# Database
npm run firestore:rules  # Deploy Firestore security rules
npm run firestore:deploy # Deploy to Firebase
```

## API Endpoints

### Ride Matching
- `POST /api/rides/search` - Find available rides
- `POST /api/rides/match` - Request ride matching
- `GET /api/rides/:id` - Get ride details

### Pricing
- `POST /api/pricing/estimate` - Get fare estimate
- `GET /api/pricing/rates` - Get current rates

### User Management
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/users/profile` - Update user profile

### Emergency
- `POST /api/sos/alert` - Trigger emergency alert
- `GET /api/sos/status` - Check SOS status

## Performance Metrics

- **Query Response Time:** < 500ms average
- **Matching Algorithm:** < 2 seconds
- **Pricing Calculation:** < 200ms
- **Page Load Time:** < 2 seconds
- **Mobile Optimization:** 95+ Lighthouse score

## Troubleshooting

### Firebase Connection Issues
```bash
# Verify Firebase configuration
npm run firestore:status

# Check authentication status
npm run auth:debug
```

### LLM Response Delays
- Check Groq API rate limits
- Verify API key validity
- Check network connectivity

### SMS Delivery Issues
- Confirm Twilio credentials are correct
- Verify phone number format (E.164)
- Check Twilio account balance

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier code formatting
- Unit tests required for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/isham077/RideX/issues)
- Contact the maintainer at [isham077](https://github.com/isham077)

## Changelog

### v1.0.0 (Current)
- Initial AI-driven carpooling system
- Dynamic pricing engine
- Real-time trust scoring
- Emergency SOS protocol
- Firebase backend integration

---

**Language Composition:**
- TypeScript: 99.6%
- Other: 0.4%

*Maintained by [isham077](https://github.com/isham077)*
*Last Updated: June 2026*
