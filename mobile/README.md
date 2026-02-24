# Joumaa Mobile App

React Native (Expo) client for the Joumaa distribution system.  
The app has two role-based experiences:

- Admin app
- Employee app

## Highlights

- Arabic-first UI
- Role-based login and navigation
- Live updates with Socket.io
- Distribution and receiving workflows
- Employee status handling (active/suspended/deleted)
- In-app dialer integration (`tel:`)
- WhatsApp report opening for employee-specific reporting

## Stack

- Expo
- React Native
- Expo Router
- Axios
- Socket.io client
- TypeScript

## Project Structure

```text
mobile/
  app/
    (admin)/
    (employee)/
    login.tsx
    index.tsx
  src/
    components/
    config/
    context/
    hooks/
    services/
    theme/
    types/
    utils/
```

## Prerequisites

- Node.js 18+
- Backend API running (`backend/` project)

## Setup

1. Install packages:

```bash
npm install
```

2. Start Expo:

```bash
npm run start
```

3. Run on device/simulator:

- `npm run android`
- `npm run ios`
- `npm run web`

## API Base URL

The app automatically resolves API base URL and appends `/api`.

Default behavior:

- Android emulator: `http://10.0.x.x:5000/api`
- Other platforms: `http://localhost:5000/api`

You can also set:

- `EXPO_PUBLIC_API_BASE_URL`

Or update the server URL inside the app settings screen.

## Authentication

### Admin Login

- Uses phone/name + password

### Employee Login

- Uses generated employee unique code

## Main Screens

### Admin

- Dashboard
- Employees list
- Employee details
- Live feed
- Reports
- Notifications
- Settings
- Merchants

### Employee

- Dashboard
- New distribution
- Distribution history
- Inventory
- Merchants
- Receive stock

## Runtime Behavior Worth Knowing

- If an employee is suspended:
  - operation screens block submitting
  - app shows a warning with admin contact
- If an employee is deleted:
  - backend invalidates session
  - socket event forces logout
- Reports from admin can open WhatsApp directly for the selected employee contact.

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`

## Quality Checks

Lint:

```bash
npm run lint
```

Type check:

```bash
npx tsc --noEmit
```

## Troubleshooting

If the app cannot reach the backend:

1. Confirm backend is running on port `5000`.
2. Use your machine LAN IP when testing on a physical device.
3. Make sure phone and backend machine are on the same network.
4. Verify the API URL in app settings includes the correct host and port.
