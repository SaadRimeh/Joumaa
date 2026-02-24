# Joumaa Backend API

Express + MongoDB backend for managing poultry distribution operations between employees and merchants.

## What This Service Handles

- Admin and employee authentication (JWT-based)
- Employee lifecycle management:
  - create
  - suspend / reactivate
  - delete (with session revocation)
- Distribution and receiving workflows
- Merchant management
- Daily and monthly reporting
- PDF / Excel report export
- Real-time updates via Socket.io
- Optional WhatsApp integration for report delivery

## Stack

- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- JWT (`jsonwebtoken`)
- Excel export (`exceljs`)
- PDF export (`pdfkit`)

## Project Structure

```text
backend/
  src/
    app.js
    server.js
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    utils/
```

## Prerequisites

- Node.js 18+
- MongoDB instance (local or remote)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
copy .env.example .env
```

3. Update your environment values if needed.

4. Run in development:

```bash
npm run dev
```

The server starts on `http://localhost:5000` by default.

Health check endpoint:

```text
GET /health
```

API base path:

```text
/api
```

## Environment Variables

Defined in `.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_NAME`
- `ADMIN_PHONE`
- `ADMIN_PASSWORD`
- `DEFAULT_KILO_PRICE`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION`

## Bootstrap Behavior

On startup, the backend ensures the admin account exists (or updates it from `.env` values).

Default values from `.env.example`:

- name: use `ADMIN_NAME` from `.env.example`
- phone: `0940439962`
- password: `aziz0940439962`

## NPM Scripts

- `npm run dev` - run with nodemon
- `npm start` - run production server
- `npm run lint` - placeholder (`No lint configured`)

## API Overview

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Admin

- `GET /api/admin/dashboard/stats`
- `GET /api/admin/dashboard/live-feed`
- `GET /api/admin/price`
- `PATCH /api/admin/price`
- `GET /api/admin/price/history`
- `POST /api/admin/employees`
- `GET /api/admin/employees`
- `GET /api/admin/employees/:employeeId`
- `PATCH /api/admin/employees/:employeeId/status`
- `DELETE /api/admin/employees/:employeeId`
- `GET /api/admin/employees/:employeeId/distributions`
- `GET /api/admin/merchants`
- `POST /api/admin/merchants`
- `GET /api/admin/reports/daily`
- `GET /api/admin/reports/employees`
- `GET /api/admin/reports/merchants`
- `GET /api/admin/reports/export?type=daily|employees|merchants&format=excel|pdf`
- `POST /api/admin/reports/send-whatsapp`

### Employee

- `GET /api/employee/dashboard`
- `GET /api/employee/inventory`
- `POST /api/employee/receivings`
- `POST /api/employee/distributions`
- `GET /api/employee/distributions`
- `GET /api/employee/merchants`
- `POST /api/employee/merchants`

## Business Rules Implemented

- Employees marked as inactive cannot create operations.
- Suspended employees receive a clear API message with admin contact details.
- Deleting an employee revokes active sessions immediately.
- Requests from deleted employee sessions are rejected.
- Admin dashboard remains day-based.
- Employee/merchant report ranges default to the current month if no range is provided.

## Error Format

Standard API error response:

```json
{
  "success": false,
  "message": "Error message",
  "code": "OPTIONAL_ERROR_CODE",
  "details": {}
}
```

Custom codes currently used:

- `EMPLOYEE_SUSPENDED`
- `EMPLOYEE_SESSION_REVOKED`

## Real-Time Events

The API emits Socket.io events for both admin and employee clients:

- `distribution:new`
- `receiving:new`
- `price:updated`
- `stats:updated` (admin room)
- `stock:low`
- `employee:status-updated` (employee room)
- `employee:session-revoked` (employee room)

## Notes

- WhatsApp sending requires valid Meta WhatsApp Cloud credentials in `.env`.
- If you are testing with a physical phone for the mobile app, make sure this backend is reachable over LAN.
