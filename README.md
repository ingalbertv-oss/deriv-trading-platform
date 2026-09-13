# Deriv Pro

Plataforma web full-stack para consultar mercados, administrar cuentas Deriv y operar contratos desde una integración centralizada en el backend.

> Estado documentado: 12 de septiembre de 2026. Describe lo encontrado en el repositorio; no implica que la integración con Deriv haya sido validada en producción.

## Estado actual

- Backend TypeScript compilando correctamente con `tsc`.
- Frontend TypeScript/Vite compilando correctamente para producción.
- Integración Deriv encapsulada en el backend mediante REST y WebSocket.
- Autenticación local por sesión y flujo OAuth con PKCE para Deriv.
- Persistencia PostgreSQL mediante Prisma.
- El lint del backend no ejecuta porque falta configuración ESLint compatible con ESLint 10.
- No hay suite de pruebas automatizadas: `backend npm test` es un placeholder.
- OAuth, trading, WebSocket real y despliegue productivo requieren validación con credenciales y servicios disponibles.

## Arquitectura

```text
React + Vite (frontend :5173)
        │ REST / cookie de sesión
        ▼
Express + TypeScript (backend :3001)
        ├── PostgreSQL + Prisma
        ├── WebSocket interno: /ws/app
        └── WebSocket Deriv: wss://ws.derivws.com/websockets/v3
```

El frontend no se conecta directamente a Deriv. El backend gestiona OAuth, credenciales, conexiones Deriv y eventos internos.

## Funcionalidades disponibles

### Frontend

Rutas implementadas:

- `/login`: registro, inicio y cierre de sesión.
- `/dashboard`: resumen de cuenta, balance, portafolio y contratos abiertos; permite vender contratos.
- `/accounts`: listado y selección de cuentas Deriv.
- `/market`: búsqueda/listado de símbolos y datos de mercado.
- `/market/:symbol`: detalle del símbolo y panel de propuesta/compra.
- `/history`: historial de operaciones/transacciones.
- `/settings/integrations`: estado y gestión de la integración OAuth con Deriv.

Tecnologías: React, React Router, TanStack Query, Zustand, Axios, Recharts, Lucide React y react-hot-toast.

### Backend

Módulos implementados:

- `auth`: registro, login, logout, sesión y usuario actual.
- `deriv-auth`: OAuth con PKCE, `state` y callback.
- `deriv-accounts`: cuentas Deriv y selección de cuenta activa.
- `deriv-ws`: conexiones Deriv, reconexión y WebSocket interno.
- `deriv-market`: símbolos activos, horarios, historial de ticks y suscripciones.
- `deriv-account-data`: balance, portafolio, estado de cuenta, transacciones y profit table.
- `deriv-trade`: proposal, buy, sell y suscripción de contrato abierto.
- `watchlists`: CRUD de listas y símbolos.
- `audit-logs`: servicio de registro de acciones.
- `deriv-shared`: tipos, adaptador y normalización de respuestas Deriv.

La API está montada bajo `/api`; el endpoint de salud es `GET /health`.

## Modelo de datos

Prisma define entidades para usuarios, sesiones, conexiones y cuentas Deriv, sesiones WebSocket, watchlists, caché de ticks/candles, transacciones y auditoría. El datasource configurado es PostgreSQL.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL.
- Cuenta de desarrollador Deriv y aplicación OAuth registrada.

## Instalación local

```bash
cd backend
npm install
cp .env.example .env
# Completar las variables de backend/.env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
# Completar las variables de frontend/.env
npm run dev
```

URLs por defecto:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health
- WebSocket interno: `ws://localhost:3001/ws/app`

El seed crea el usuario demo indicado en `backend/prisma/seed.ts`. No usar esas credenciales fuera de desarrollo.

## Variables de entorno

Backend: `APP_ENV`, `APP_URL`, `FRONTEND_URL`, `BACKEND_PORT`, `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `DERIV_APP_ID`, `DERIV_CLIENT_ID`, `DERIV_CLIENT_SECRET`, `DERIV_AUTH_BASE_URL`, `DERIV_API_BASE_URL`, `DERIV_WS_PUBLIC_URL` y `OAUTH_REDIRECT_URI`.

Frontend: `VITE_API_URL` y `VITE_WS_URL`.

Los archivos `.env` locales no deben versionarse. Revisar especialmente cualquier `.env.production` antes de hacer commit o despliegue.

## Comandos

Backend: `npm run dev`, `npm run build`, `npm run start`, `npm run db:generate`, `npm run db:push`, `npm run db:migrate`, `npm run db:migrate:prod`, `npm run db:seed`, `npm run db:studio`, `npm run lint`.

Frontend: `npm run dev`, `npm run build`, `npm run preview`.

## Seguridad y pendientes conocidos

La implementación incluye cookies HttpOnly, Helmet, CORS con credenciales, rate limiting, cifrado AES-256 de tokens, PKCE, validación de `state`, filtrado de datos sensibles en logs y separación de secretos del frontend.

Antes de producción se deben completar las pruebas de OAuth y WebSocket con Deriv, validar operaciones en cuenta demo, revisar expiración/refresco de tokens, configurar HTTPS/dominio, añadir pruebas automatizadas, corregir el lint y revisar el bundle frontend (el build actual emite un chunk minificado superior a 500 kB).

Para el plan de auditoría detallado, consultar [AUDIT_PLAN.md](AUDIT_PLAN.md).

La investigación de compatibilidad con la API vigente de Deriv está en [DERIV_API_RESEARCH.md](DERIV_API_RESEARCH.md).

El plan de mejora e integración está en [IMPROVEMENT_INTEGRATION_PLAN.md](IMPROVEMENT_INTEGRATION_PLAN.md).

El plan de migración a Laravel, MySQL y React está en [LARAVEL_MIGRATION_PLAN.md](LARAVEL_MIGRATION_PLAN.md).
