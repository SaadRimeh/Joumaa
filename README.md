# Joumaa

Joumaa is a role-based poultry distribution system with:

- A Node.js backend API
- A mobile app (Expo / React Native)

It is designed for day-to-day field operations: receiving stock, distributing to merchants, tracking totals, and monitoring staff activity in real time.

## Repository Layout

```text
joumaa/
  backend/   # Express + MongoDB API
  mobile/    # Expo mobile client (admin + employee)
```

## Core Capabilities

- Admin and employee authentication
- Employee management (create, suspend/reactivate, delete)
- Merchant management
- Distribution and receiving operations
- Daily dashboard metrics
- Monthly performance reporting
- Report export (PDF/Excel)
- WhatsApp report integration
- Real-time event stream with Socket.io
- Forced logout for deleted employee accounts

## Tech Stack

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- JWT

### Mobile

- Expo
- React Native
- Expo Router
- Axios
- Socket.io client
- TypeScript

## Quick Start

### 1. Start Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend default URL:

```text
http://localhost:5000
```

Health check:

```text
GET /health
```

### 2. Start Mobile

Open a second terminal:

```bash
cd mobile
npm install
npm run start
```

Then choose:

- Android emulator: `npm run android`
- iOS simulator: `npm run ios`
- Web: `npm run web`

## Environment Notes

### Backend (`backend/.env`)

Important variables:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_NAME`
- `ADMIN_PHONE`
- `ADMIN_PASSWORD`
- `DEFAULT_KILO_PRICE`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

### Mobile

Optional variable:

- `EXPO_PUBLIC_API_BASE_URL`

If not provided, the app uses:

- `http://10.0.2.2:5000/api` on Android emulator
- `http://localhost:5000/api` on other platforms

## Default Admin Credentials (From `.env.example`)

- phone: `0940439962`
- password: `aziz0940439962`

You can change these in `backend/.env`.

## API Overview

Base path:

```text
/api
```

Main groups:

- `/auth`
- `/admin`
- `/employee`

For the complete endpoint list, see:

- `backend/README.md`

## Real-Time Events

The backend emits events used by the mobile app:

- `distribution:new`
- `receiving:new`
- `price:updated`
- `stats:updated`
- `stock:low`
- `employee:status-updated`
- `employee:session-revoked`

## Behavior Rules Implemented

- Suspended employees cannot create operations.
- Suspended state includes a user-facing warning and admin contact information.
- Deleted employee accounts are logged out immediately and blocked from further API access.
- Admin dashboard stays day-based.
- Employee and merchant performance reports default to monthly range.

## Validation Commands

### Backend

```bash
cd backend
npm run lint
```

### Mobile

```bash
cd mobile
npm run lint
npx tsc --noEmit
```

## Documentation Per Service

- Backend docs: `backend/README.md`
- Mobile docs: `mobile/README.md`
