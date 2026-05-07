# RideX - Next-Gen AI Carpooling Platform 🚗

RideX is a modern, intelligent carpooling and ride-sharing application designed to make travel affordable, eco-friendly, and highly secure. Powered by advanced Machine Learning for dynamic pricing, and an AI ChatBot for seamless user interaction, RideX redefines the ride-sharing experience.

## ✨ Key Features

- **AI-Powered ChatBot (RideAI):** Built-in virtual assistant to help users find rides, check bookings, and query platform data using natural language.
- **Dynamic ML Pricing Engine:** Fair and transparent pricing calculated in real-time using a gradient boosting model based on distance, car segment, and market demand.
- **Police Checkpoint Mode:** A secure, "one-tap" QR Code generation tool for drivers. Police can scan the code to instantly verify passenger manifests, identities, and live baggage photos without needing an account.
- **Advanced Trust Score System:** Dynamic reputation tracking incorporating passenger reviews, eco-impact, and completion rates.
- **SOS Emergency Protocol:** Integrated with Twilio to instantly broadcast emergency alerts with live GPS coordinates to trusted contacts and the admin dashboard.
- **Real-time Interactive Maps:** Leaflet and OpenStreetMap integration for route visualization.
- **Baggage Verification:** Live photo capture during ride check-in to ensure security and compliance.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend/Database:** Firebase (Firestore, Authentication, Storage)
- **AI/ML:** Groq API (LLM Chatbot), Custom Gradient Boosting Logic (Pricing)
- **Mapping:** Leaflet, React-Leaflet
- **Communications:** Twilio API (SOS SMS alerts)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/isham077/RideX.git
   cd RideX
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your required API keys:
   ```env
   VITE_FIREBASE_API_KEY="your_firebase_api_key"
   GROQ_API_KEY="your_groq_api_key"
   TWILIO_ACCOUNT_SID="your_twilio_sid"
   TWILIO_AUTH_TOKEN="your_twilio_token"
   ```

4. **Run the application:**
   ```bash
   npm run dev
   ```
   *The application will start on `http://localhost:3000`.*

## 🔒 Security & Privacy
RideX is built with strict privacy rules. General ride data is public for discoverability, but sensitive booking information, user contact details, and baggage contents are strictly protected by robust Firestore security rules.

## 📄 License
This project is licensed under the MIT License.
