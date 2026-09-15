# Plan de sesión Google → Deriv

## Objetivo

Permitir que un usuario se autentique en DERIV con Google y, desde esa sesión local, pueda iniciar de forma guiada una sesión autenticada con Deriv para consumir sus endpoints. Google y Deriv son identidades distintas: el login Google no sustituye el consentimiento OAuth de Deriv ni permite fabricar un token Deriv.

## Flujo propuesto

```text
Google Identity Services
  → GET challenge + nonce HttpOnly
  → POST /api/auth/google
  → cookie session_token HttpOnly
  → GET /api/auth/deriv/status
  → si no hay conexión: GET /api/auth/deriv/start
  → consentimiento Deriv + callback con state/PKCE
  → token Deriv cifrado en backend
  → sincronización de cuentas
  → conexión WebSocket por cuenta seleccionada
  → endpoints /api/deriv/* usando la sesión local
```

## Fases

### Fase 1 — Google en desarrollo

- Crear un OAuth Client ID Web en Google Cloud.
- Autorizar `http://localhost:5173` como origen JavaScript.
- Configurar `GOOGLE_AUTH_ENABLED=true` y `GOOGLE_CLIENT_ID` solo en `backend/.env`.
- Configurar `VITE_GOOGLE_AUTH_ENABLED=true` y el mismo Client ID público en `frontend/.env`.
- Mantener `GOOGLE_CLIENT_SECRET` fuera del frontend; el flujo GIS por ID token no lo necesita.

### Fase 2 — Identidad y sesión local

- Aplicar la migración `external_identities`.
- Validar firma, `iss`, `aud`, `exp`, `sub`, `email`, `email_verified` y `nonce` en backend.
- Crear usuarios Google nuevos como usuarios básicos.
- No vincular automáticamente por coincidencia de correo.
- Conservar la cookie `session_token` HttpOnly y el login tradicional.

### Fase 3 — Vincular Deriv desde la sesión Google

- El frontend consulta `/api/auth/deriv/status` después de `checkAuth`.
- Si el estado es `disconnected`, muestra “Conectar Deriv”.
- El botón navega a `/api/auth/deriv/start`; no envía tokens desde React.
- El backend crea y conserva `state` y `code_verifier` ligados al usuario/sesión, valida el callback y cifra `access_token`/`refresh_token`.
- El callback no debe aceptar un `userId` desde query string; debe resolver al usuario mediante state válido.

### Fase 4 — Sesión directa en endpoints Deriv

- Tras callback correcto, sincronizar cuentas con `/api/deriv/accounts/sync`.
- Seleccionar explícitamente la cuenta activa/default.
- Conectar el WebSocket autenticado solo después de tener una cuenta válida.
- Redirigir a `/accounts` o `/dashboard` y mostrar el estado real de conexión.
- Las rutas Deriv continúan protegidas por la cookie de sesión local.
- La sesión Google nunca se convierte en token Deriv ni se expone al GPT/frontend.

### Fase 5 — Renovación, salida y fallos

- Renovar tokens Deriv en backend cuando corresponda.
- Invalidar la conexión local al desconectar y cerrar sockets relacionados.
- Google logout y Deriv disconnect deben ser acciones separadas.
- Si Deriv OAuth falla, conservar la sesión Google y mostrar reintento.
- No permitir trading automático como efecto lateral del login; las rutas de trading siguen fuera del flujo read-only.

### Fase 6 — Producción

- Registrar en Google Cloud los orígenes productivos definitivos.
- Configurar cookies `Secure`, `SameSite` y CORS con dominios explícitos.
- Ejecutar migración Prisma en la base de DERIV con backup y rollback.
- Validar login Google → conexión Deriv → balance/portfolio → logout.
- Monitorear auditoría sin registrar tokens, códigos, cookies ni cabeceras Authorization.

## Contratos previstos

```http
GET  /api/auth/google/challenge
POST /api/auth/google
GET  /api/auth/deriv/status
GET  /api/auth/deriv/start
GET  /api/auth/deriv/callback
POST /api/deriv/accounts/sync
GET  /api/deriv/accounts/active
POST /api/deriv/accounts/:derivAccountId/ws/connect
```

## Bloqueos para activación real

- Client ID de Google para DERIV aún no confirmado.
- Orígenes productivos aún no confirmados.
- La migración Prisma de identidades externas debe ejecutarse en la base PostgreSQL autorizada.
- La prueba end-to-end requiere una cuenta demo de Deriv y consentimiento OAuth real.
