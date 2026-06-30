# RideX Core System

An intelligent, AI-driven carpooling architecture designed to optimize ride-sharing logistics through dynamic pricing, real-time trust scoring, and a conversational interface.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_API-0F1419?style=flat-square&logo=groq&logoColor=white)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture-overview)
- [Core Modules](#core-modules)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [System Configuration](#system-configuration)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Performance Metrics](#performance-metrics)
- [Security Posture](#security-posture)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

RideX is a next-generation AI-powered carpooling platform that revolutionizes ride-sharing through intelligent algorithms and real-time decision-making. The system combines a conversational AI interface with sophisticated backend services to provide users with seamless, intelligent ride-matching experiences. Built with modern web technologies and Firebase, RideX delivers enterprise-grade scalability and security.

### Key Features

- 🤖 **AI-Driven Matching:** Natural language queries processed by Groq LLM for intelligent ride matching. Users can request rides using conversational language like "Show me rides to downtown" or "Find carpools leaving at 5 PM."
- 💰 **Dynamic Pricing:** Real-time fare calculation based on demand, distance, vehicle class, and market conditions using a custom gradient boosting model.
- 🔐 **Trust Scoring:** Machine learning-based real-time user verification and trust metrics that evaluate ride history, ratings, and behavior patterns.
- 📍 **Geolocation Integration:** Real-time GPS tracking with integrated Google Maps API for accurate routing and emergency protocols.
- 🚨 **SOS Protocol:** Integrated emergency response system via Twilio with one-click emergency alerts and automated emergency contact notifications.

## Architecture Overview

RideX is built on a serverless React/Vite frontend that interacts directly with Firebase via heavily restricted Firestore Security Rules. The system abstracts complex logistics into natural language queries, enabling users to interact with sophisticated backend systems through conversational AI powered by the Groq API.

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

## Core Modules

### AI Conversational Interface (RideAI)

Integrated with the Groq API, the LLM intercepts user queries, translates them into structured Firestore queries via tool calling, and formats the output into human-readable data. Supports natural language requests enabling users to search, filter, and book rides using conversational language without navigating complex UI flows.

### Dynamic Pricing Engine

A custom gradient boosting model that calculates real-time fare estimates by evaluating multiple factors including:
- Route distance and complexity
- Vehicle segment tier (economy, premium, luxury)
- Simulated market demand and surge pricing
- Time-of-day multipliers (peak vs. off-peak rates)
- Driver rating adjustments and incentives

### Checkpoint Manifest System

A bypass architecture for strict Firestore rules that aggregates protected sub-collection data (bookings, baggage images) into a localized public manifest snapshot upon driver request. Generates verified snapshots for police verification endpoints while maintaining strict data isolation and PII protection.

### Twilio SOS Protocol

Event-driven emergency broadcasting system that interfaces with device geolocation APIs to dispatch immediate SMS payloads to administrative and emergency contacts. Provides one-click emergency alerting with automatic location sharing and emergency contact notification.

### Real-Time Trust Scoring

Machine learning-based user verification system that evaluates:
- Ride completion history and reliability
- User ratings and reviews from other drivers/passengers
- Payment history and financial standing
- Behavior patterns and interaction metrics
- Report/complaint metrics and dispute resolution outcomes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **State Management** | React Context API / Zustand |
| **Backend** | Firebase Cloud Functions, Firestore |
| **Authentication** | Firebase Auth with Multi-Factor Support |
| **Database** | Firestore (NoSQL) with Security Rules |
| **AI/ML** | Groq LLM API, Custom ML Models |
| **Communications** | Twilio SMS/Voice, WebSockets |
| **Geolocation** | Browser Geolocation API, Google Maps API |
| **DevOps** | Vite Build System, Firebase Hosting |

## Prerequisites

Before getting started, ensure you have the following installed:

Node.js (v18 or later)
npm or Yarn package manager
Git for version control
A Firebase account (the free tier is sufficient)
Valid API keys for the following services:
Groq
Twilio
Google Maps

## Quick Start

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/isham077/RideX.git
cd RideX
```

2. **Navigate to the project directory:**
```bash
cd RideX\ Final00
```

3. **Install dependencies:**
```bash
npm install
# or
yarn install
```

4. **Set up environment variables:**
Create a `.env` file in the project root with the following variables (see [System Configuration](#system-configuration) for details):
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

5. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
RideX Final00/
├── src/
│   ├── components/              # Reusable React components
│   ├── pages/                   # Page-level components and routes
│   ├── services/                # Firebase and external API services
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions and helpers
│   ├── types/                   # TypeScript type definitions and interfaces
│   ├── styles/                  # Global styles and TailwindCSS config
│   └── main.tsx                 # Application entry point
├── public/                      # Static assets and images
├── index.html                   # HTML template
├── vite.config.ts               # Vite build configuration
├── tsconfig.json                # TypeScript configuration
├── firebase-applet-config.json  # Firebase project configuration
├── tailwind.config.js           # TailwindCSS theme and plugin config
└── package.json                 # Project dependencies and scripts
```

## System Configuration

### Environment Variables

The platform requires the following environment variables to instantiate core services:

| Environment Variable | Description | Required |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase initialization and auth gateway | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket for media | ✅ |
| `GROQ_API_KEY` | Authentication for the LLM processing pipeline | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio REST API Account Identifier | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio REST API Authorization Token | ✅ |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for SMS dispatch (E.164 format) | ✅ |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API for routing and geocoding | ✅ |

### Obtaining API Keys

**Firebase Setup:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Copy the configuration values from Project Settings

**Groq API:**
1. Visit [Groq Console](https://console.groq.com)
2. Create an API key in your account settings
3. Copy the API key to your `.env` file

**Twilio Setup:**
1. Create account at [Twilio](https://www.twilio.com)
2. Verify a phone number or purchase a Twilio number
3. Copy your Account SID and Auth Token from the dashboard

**Google Maps API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps JavaScript API and Geocoding API
3. Create an API key from Credentials section

## Available Scripts

### Development Commands

```bash
# Start development server with hot module reload
npm run dev

# Run TypeScript type checking
npm run type-check

# Run ESLint and style checks
npm run lint

# Format code with Prettier
npm run format
```

### Production Commands

```bash
# Build optimized production bundle
npm run build

# Preview the production build locally
npm run preview
```

### Firebase Commands

```bash
# Deploy Firestore security rules
npm run firestore:rules

# Deploy entire project to Firebase Hosting
npm run firebase:deploy
```

## API Endpoints

### Ride Matching
- `POST /api/rides/search` - Find available rides with filters
- `POST /api/rides/match` - Request ride matching based on preferences
- `GET /api/rides/:id` - Get detailed information about a specific ride
- `POST /api/rides/:id/book` - Book a ride (requires authentication)

### Pricing
- `POST /api/pricing/estimate` - Get real-time fare estimate
- `GET /api/pricing/rates` - Get current base rates and multipliers

### User Management
- `POST /api/auth/register` - User registration and account creation
- `POST /api/auth/login` - User login with credentials
- `POST /api/users/profile` - Update user profile information
- `GET /api/users/:id` - Get user profile data
- `POST /api/users/verify` - Verify user identity

### Emergency
- `POST /api/sos/alert` - Trigger emergency alert with location
- `GET /api/sos/status` - Check SOS system status

### Trust & Ratings
- `POST /api/ratings/submit` - Submit rating after ride completion
- `GET /api/users/:id/trust-score` - Get user trust score

## Performance Metrics

- **Query Response Time:** < 500ms average (Firestore queries)
- **Ride Matching Algorithm:** < 2 seconds (AI processing)
- **Pricing Calculation:** < 200ms (real-time computation)
- **Page Load Time:** < 2 seconds (optimized Vite bundles)
- **Mobile Optimization:** 95+ Lighthouse score

## Security Posture

### Data Access
- **Firestore Security Rules:** Enforced exclusively at the database layer via `firestore.rules`
- **Row-Level Security:** User data completely isolated per authenticated account
- **API Key Protection:** All sensitive keys stored in environment variables, never committed to repository

### Authentication & Authorization
- **Firebase Auth:** Multi-factor authentication (MFA) support with secure session management
- **Token Management:** JWT tokens with automatic refresh and expiration handling
- **Role-Based Access Control:** Driver, passenger, and admin privilege levels with granular permissions

### Manifest Bypass Security
The police verification endpoint utilizes a controlled, read-only snapshot mechanism, ensuring that:
- Active bookings remain completely isolated from verification snapshots
- User Personally Identifiable Information (PII) is fully protected and masked
- Public unauthenticated access is strictly prevented
- Comprehensive audit trails log all verification requests with timestamps

### Data Encryption
- **In Transit:** All API calls use HTTPS/TLS 1.3 encryption with certificate pinning
- **At Rest:** Firebase encryption by default with customer-managed keys available
- **PII Masking:** Sensitive user data masked in logs, reports, and email communications

### Third-Party Security
- **Groq API:** Secure LLM processing with encrypted requests/responses and data privacy
- **Twilio:** HIPAA-compliant communications platform with encryption standards
- **Firebase:** SOC 2 Type II certified infrastructure with regular security audits

### Best Practices
- Regular dependency updates and security patches
- Automated vulnerability scanning with Snyk
- OWASP Top 10 compliance verification
- Penetration testing recommendations for production deployments

## Troubleshooting

### Firebase Connection Issues

**Problem:** Firebase initialization fails or Firestore queries timeout

**Solutions:**
```bash
# Verify Firebase configuration is correct
cat firebase-applet-config.json

# Check if Firebase rules are deployed
npm run firestore:rules

# Clear browser cache and local storage
# Then reload the application
```

- Ensure `.env` file contains valid Firebase credentials
- Verify Firebase project is active (check Firebase Console)
- Check internet connectivity and network firewall settings

### LLM Response Delays

**Problem:** AI responses are slow or timing out

**Solutions:**
- Check Groq API rate limits in your account dashboard
- Verify API key is valid and has active billing
- Check network connectivity and latency
- Consider upgrading Groq tier if rate limits are exceeded

### SMS Delivery Issues

**Problem:** SOS alerts or SMS messages not being sent

**Solutions:**
- Confirm Twilio credentials (Account SID and Auth Token) are correct
- Verify phone number format is E.164 compliant (e.g., +1234567890)
- Check Twilio account balance and verify credits are available
- Enable SMS geographic permissions in Twilio console
- Check browser console for error messages

### Build Errors

**Problem:** `npm run build` fails with TypeScript errors

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type checking to identify issues
npm run type-check

# Clear Vite cache
rm -rf dist .vite
```

### Port Already in Use

**Problem:** `npm run dev` fails with "Port 5173 already in use"

**Solutions:**
```bash
# Run on alternative port
npm run dev -- --port 3000

# Find and kill process using port 5173
lsof -i :5173
kill -9 <PID>
```

## Contributing

We welcome contributions from developers of all skill levels! Please follow these guidelines:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/RideX.git
   cd RideX
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them:
   ```bash
   git commit -m 'Add: brief description of changes'
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** with a clear description of your changes

### Code Standards

All contributions must adhere to these standards:

- **TypeScript:** Strict mode enabled (`"strict": true` in tsconfig.json)
- **Linting:** ESLint configuration enforced (run `npm run lint`)
- **Formatting:** Prettier code formatting required (run `npm run format`)
- **Testing:** Unit tests required for new features (Jest/Vitest)
- **Documentation:** Update README and code comments for significant changes
- **Commits:** Use clear, descriptive commit messages with conventional format

### Pull Request Process

1. Update documentation reflecting any new features or changes
2. Add or update tests to maintain code coverage
3. Run `npm run type-check` and `npm run lint` locally
4. Ensure all tests pass before submitting PR
5. Provide a clear PR description explaining what and why

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

## Support

For issues, questions, or suggestions, please reach out through these channels:

- **GitHub Issues:** [Submit an issue](https://github.com/isham077/RideX/issues)
- **GitHub Discussions:** [Join the community](https://github.com/isham077/RideX/discussions)
- **Contact the Maintainer:** [@isham077](https://github.com/isham077)

## Changelog

### v1.0.0 (Current Release)
- ✅ Initial AI-driven carpooling system with Groq LLM integration
- ✅ Dynamic pricing engine with gradient boosting model
- ✅ Real-time trust scoring system with ML-based verification
- ✅ Emergency SOS protocol with Twilio integration
- ✅ Firebase backend with Firestore security rules
- ✅ React 19 frontend with Vite build system
- ✅ TailwindCSS responsive design
- ✅ Google Maps integration for routing

### 🚀 Upcoming Features

* 📱 **Mobile App** – Native apps for Android and iOS built with React Native.
* 📊 **Driver Analytics Dashboard** – Detailed insights into trips, earnings, and performance.
* 📅 **Scheduled & Recurring Rides** – Book rides in advance or set up recurring trips.
* 👥 **Social Features** – Invite friends, share rides, and connect with other users.
* ♿ **Accessibility Enhancements** – Improved support for screen readers and other assistive technologies.


---

**Tech Stack:** TypeScript (99.6%) | React | Firebase | Vite | Groq API | Twilio

**Maintained by:** [@isham077](https://github.com/isham077)  
**Last Updated:** January 2025  
**Repository:** [github.com/isham077/RideX](https://github.com/isham077/RideX)
