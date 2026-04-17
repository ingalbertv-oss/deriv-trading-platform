# Deriv Pro · Trading Platform

Full-stack trading platform with centralized Deriv API integration.

## Architecture

```
┌─────────────────┐       ┌─────────────────────────────────────┐
│                 │ REST  │              BACKEND                │
│    FRONTEND     │──────▶│  Express + TypeScript + Prisma      │
│  React + Vite   │       │                                     │
│                 │◀──────│  Internal WS (/ws/app)              │
│  localhost:5173 │  WS   │                                     │
└─────────────────┘       │  ┌─────────────────────────────┐   │
                          │  │ Deriv WS Service             │   │
                          │  │ (OTP → authenticated socket) │   │
                          │  └─────────┬───────────────────┘   │
                          │            │                        │
                          │            ▼                        │
                          │  ┌─────────────────────────────┐   │
                          │  │ Deriv WebSocket API          │   │
                          │  │ (wss://api.derivws.com)      │   │
                          │  └─────────────────────────────┘   │
                          │                                     │
                          │  ┌─────────────────────────────┐   │
                          │  │ PostgreSQL + Prisma ORM      │   │
                          │  └─────────────────────────────┘   │
                          │  localhost:3001                      │
                          └─────────────────────────────────────┘
```

**Key principle**: The frontend NEVER connects directly to Deriv. All Deriv integration happens server-side.

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** (via Laragon, Docker, or standalone)
- **Deriv developer account** with registered OAuth app (https://api.deriv.com)

## Setup

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your values
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random string, min 32 chars |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256 |
| `DERIV_APP_ID` | From Deriv Developer Dashboard |
| `DERIV_CLIENT_ID` | OAuth Client ID from Deriv |
| `OAUTH_REDIRECT_URI` | Must match Deriv app config |

### 3. Database

```bash
cd backend

# Create PostgreSQL database "deriv_platform"
# Then run migrations:
npm run db:push      # Push schema (dev)
# OR
npm run db:migrate   # Full migration (recommended)

# Seed demo user
npm run db:seed
```

### 4. Run

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

### 5. Demo Login

```
Email: demo@deriv-platform.local
Password: Demo1234!
```

## Modules

### Backend
| Module | Description |
|---|---|
| `auth` | Login, register, sessions |
| `deriv-auth` | OAuth PKCE flow |
| `deriv-accounts` | Account management |
| `deriv-ws` | WebSocket service + internal WS |
| `deriv-market` | Active symbols, ticks, history |
| `deriv-account-data` | Balance, portfolio, statement |
| `watchlists` | User watchlists |
| `audit-logs` | Action logging |
| `deriv-shared` | Types, adapter, normalizers |

### Frontend
| Module | Description |
|---|---|
| `auth` | Login/Register/Callback |
| `dashboard` | Main dashboard |
| `deriv-accounts` | Account list |
| `market` | Symbols, search, watchlist |
| `history` | Transaction history |
| `settings` | Integrations/OAuth |

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/deriv/start`
- `GET /api/auth/deriv/callback`
- `GET /api/auth/deriv/status`
- `GET /api/deriv/connections`
- `DELETE /api/deriv/connections/:id`

### Accounts
- `GET /api/deriv/accounts`
- `POST /api/deriv/accounts/:accountId/select`
- `GET /api/deriv/accounts/active`
- `POST /api/deriv/accounts/:accountId/ws/connect`
- `POST /api/deriv/accounts/:accountId/ws/disconnect`

### Market
- `GET /api/deriv/market/active-symbols`
- `GET /api/deriv/market/trading-times`
- `GET /api/deriv/market/ticks-history`
- `POST /api/deriv/market/subscribe`
- `POST /api/deriv/market/unsubscribe`

### Account Data
- `GET /api/deriv/account/balance`
- `GET /api/deriv/account/portfolio`
- `GET /api/deriv/account/statement`
- `GET /api/deriv/account/transactions`
- `GET /api/deriv/account/profit-table`

### Watchlists
- `GET /api/watchlists`
- `POST /api/watchlists`
- `PATCH /api/watchlists/:id`
- `DELETE /api/watchlists/:id`
- `POST /api/watchlists/:id/symbols`
- `DELETE /api/watchlists/:id/symbols/:symbol`

### WebSocket
- `ws://localhost:3001/ws/app?userId=xxx`

## Security

- ✅ HttpOnly + Secure + SameSite cookies
- ✅ Tokens encrypted at rest (AES-256)
- ✅ PKCE in OAuth flow
- ✅ State validation
- ✅ Rate limiting
- ✅ Helmet headers
- ✅ CORS whitelist
- ✅ Sensitive data filtering in logs
- ✅ No secrets in frontend

## Pending (Requires Deriv Credentials)

- [ ] Real OAuth flow test with live Deriv app_id
- [ ] WebSocket subscription validation with real account
- [ ] Token refresh logic (if Deriv provides refresh_token)
- [ ] Production HTTPS + domain setup
