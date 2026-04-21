# Mobile Invoice Dispatcher

This project contains the complete end-to-end mobile application for the Invoice Dispatcher system.

It is split into two directories:
1. `backend/`: Node.js + Express + MongoDB REST API server serving mobile devices.
2. `mobile/`: React Native (Expo) frontend application with fully replicated UI & features.

## Prerequisites

- Node.js installed
- MongoDB installed and running locally (`mongodb://127.0.0.1:27017`)
- Android Emulator / Expo Go on physical device

## Step 1: Start Backend Server

Open a terminal and:
```bash
cd mobile-app/backend
npm install
npm run dev
```

> **Note**: I have already run the auto-seeder to populate dummy data (Products, Stock, Trucks, Offers, Customers). The backend runs on Port `5050`.

## Step 2: Run the React Native Mobile App

Open a second terminal and:
```bash
cd mobile-app/mobile
npm install
npm start
```

Press `a` in the terminal to launch the Android Emulator, or scan the QR code with the Expo Go app.

### API Connectivity Note
The mobile app tries to connect to the backend automatically:
- On **Android Emulator**, it connects safely through `http://10.0.2.2:5050`
- On physical devices or iOS simulators, please open `mobile-app/mobile/src/lib/api.ts` and change `API_URL` to your computer's local IP address (e.g. `192.168.1.100:5050`).

## App Usage

You can log in with identical credentials as the Web App:

**Admin Role:**
- **Code:** `admin`

**Driver Role:**
- **Code:** `driver`

All 12+ screens are fully replicated inside `src/screens` using native components and bottom tabs/drawer navigation concepts. The data correctly caches offline with React Query, and Local Auth is done via AsyncStorage.
