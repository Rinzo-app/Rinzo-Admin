# Saaf Admin - Internal Control Panel

## Overview
Internal admin web app for the Saaf laundry marketplace. Used by admins to approve laundry shops, approve pickup/delivery riders, and manage disputes.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)

## Default Admin Credentials
- Username: `admin` | Password: `admin123`
- Username: `ops` | Password: `ops123`

## Key Features
1. **Laundry Shop Management** - View/approve/reject/suspend laundry shops
2. **Rider Management** - View/approve/reject/suspend pickup & delivery riders
3. **Disputes** - View disputes, update status, add internal notes
4. **Orders** - Read-only order viewing for debugging

## Project Structure
```
client/src/
  pages/        - login, shops, riders, disputes, orders
  components/   - app-sidebar, data-table, status-badge, page-header
  lib/          - auth context, query client
server/
  routes.ts     - API routes with session auth
  storage.ts    - Database storage layer
  db.ts         - Drizzle database connection
  seed.ts       - Seed data for development
  auth.ts       - Password hashing utilities
shared/
  schema.ts     - Drizzle schemas and Zod validators
```

## API Endpoints
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin
- `GET /api/shops` - List all shops
- `PATCH /api/shops/:id/status` - Update shop status
- `GET /api/riders` - List all riders
- `PATCH /api/riders/:id/status` - Update rider status
- `GET /api/disputes` - List all disputes
- `PATCH /api/disputes/:id` - Update dispute status and notes
- `GET /api/orders` - List all orders (read-only)
