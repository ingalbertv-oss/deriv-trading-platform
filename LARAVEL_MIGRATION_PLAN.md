# Plan de migración a Laravel + MySQL + React

## Objetivo

Migrar el backend actual de Express/TypeScript/Prisma/PostgreSQL a Laravel/PHP/MySQL, conservando el frontend React y manteniendo el contrato funcional de Deriv Pro: autenticación, OAuth 2.0 con PKCE, cuentas Deriv, mercado, WebSockets, watchlists, historial y trading demo.

La migración debe ser incremental, reversible y con una etapa de coexistencia. No se debe activar trading real durante la transición.

## Arquitectura objetivo

```text
React + Vite
        │ Axios + cookies Sanctum
        ▼
Laravel API
        ├── MySQL + Eloquent
        ├── Redis: cache, locks, queues y estado efímero
        ├── Laravel Reverb/Echo: eventos hacia React
        ├── HTTP Client: OAuth, cuentas y OTP de Deriv
        └── Worker persistente: WebSocket upstream de Deriv
```

React permanece como aplicación independiente. No se recomienda reescribirlo a Blade, Livewire o Inertia porque ya existen rutas, stores, componentes y una integración API funcional.

## Versión y paquetes propuestos

- Laravel 13, sujeto a confirmar compatibilidad con el servidor disponible.
- PHP 8.3 o superior, con la versión soportada por la release elegida.
- MySQL 8.0+.
- Redis para colas, locks, caché y coordinación del worker WebSocket.
- Laravel Sanctum para sesión SPA mediante cookies y CSRF.
- Laravel Reverb para el WebSocket interno del frontend, con Laravel Echo en React.
- Laravel HTTP Client para OAuth, cuentas y OTP.
- Cliente WebSocket PHP para la conexión persistente con Deriv, ejecutado como worker/Artisan command.

Laravel recomienda Sanctum para SPAs con autenticación basada en cookies, y Reverb es uno de los drivers oficiales de broadcasting. Las versiones finales deben fijarse en `composer.json` y validarse contra la matriz oficial de PHP/Laravel.

## Inventario de equivalencias

| Backend actual | Backend Laravel objetivo |
|---|---|
| Express routes | `routes/api.php` + Controllers |
| `authMiddleware` | `auth:sanctum` middleware |
| express-rate-limit | `RateLimiter` y `throttle` |
| Zod | Form Requests + Rules |
| Prisma models | Eloquent Models + migrations |
| Prisma seed | Database Seeder + Factories |
| Axios backend | Laravel HTTP Client |
| Winston/Morgan | Laravel Log + middleware de request |
| AppError/error handler | Exceptions + Handler/JSON responses |
| `setInterval` PKCE map | Cache/Redis con TTL |
| `ws` Deriv | Worker persistente WebSocket |
| Internal WebSocket Server | Reverb + broadcasting privado |
| Zustand/TanStack Query | Se conserva en React |

## Fases de ejecución

### Fase 0 — Preparación y contrato

1. Congelar el comportamiento actual del backend.
2. Exportar la lista de rutas, payloads, códigos HTTP y respuestas actuales.
3. Crear fixtures anonimizados de Deriv y pruebas de contrato.
4. Revisar `frontend/.env.production`, secretos y cambios locales antes de crear la nueva estructura.
5. Crear una rama de migración y una bandera `DERIV_TRADING_ENABLED=false`.
6. Definir si el nuevo Laravel vivirá en `/backend-laravel` temporalmente o reemplazará `/backend` al finalizar.

**Salida:** contrato API aprobado y plan de rollback.

### Fase 1 — Bootstrap Laravel

1. Crear proyecto Laravel con configuración API, CORS, logging y health check.
2. Configurar MySQL local y entornos `local`, `testing`, `staging` y `production`.
3. Configurar `.env.example` sin secretos.
4. Instalar Sanctum, broadcasting/Reverb, Redis y cliente HTTP.
5. Añadir `/health` y endpoint de versión del backend.
6. Crear estructura por dominios: `Auth`, `Deriv`, `Market`, `Trading`, `Watchlists`, `Audit`.

**Aceptación:** Laravel inicia, conecta a MySQL, responde `/health` y ejecuta migraciones vacías.

### Fase 2 — Migración de base de datos

Migrar las tablas actuales a migraciones MySQL explícitas:

- `users`
- `sessions`
- `deriv_connections`
- `deriv_accounts`
- `deriv_ws_sessions`
- `watchlists`
- `watchlist_symbols`
- `market_ticks_cache`
- `market_candles_cache`
- `account_transactions_cache`
- `audit_logs`

Decisiones necesarias:

1. Mantener UUID como identificadores principales donde ya se usan.
2. Cambiar `Json` de Prisma a columnas `JSON` MySQL.
3. Definir el tipo de `BigInt` para epochs y referencias, evitando pérdida de precisión en PHP/JS.
4. Mantener índices, unicidades y cascadas equivalentes.
5. Crear un comando de migración de datos idempotente desde PostgreSQL.
6. Validar conteos, checksums y relaciones después de copiar datos.
7. No copiar tokens descifrados a archivos temporales ni logs.

**Aceptación:** conteos y relaciones coinciden; una copia de staging puede arrancar solo con MySQL.

### Fase 3 — Autenticación local

1. Migrar registro, login, logout y usuario actual.
2. Usar Sanctum con cookies stateful para el SPA React.
3. Implementar `/sanctum/csrf-cookie` antes del login.
4. Configurar dominios stateful, CORS, `withCredentials` y cookies Secure/SameSite.
5. Mantener las rutas compatibles:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/auth/logout`
   - `GET /api/auth/me`
6. Mantener respuestas compatibles para que React no requiera cambios amplios.
7. Añadir expiración, invalidación y limpieza de sesiones.

**Aceptación:** React inicia sesión contra Laravel sin modificar las rutas de navegación y las rutas privadas rechazan usuarios no autenticados.

### Fase 4 — OAuth Deriv y secretos

1. Implementar OAuth 2.0 Authorization Code + PKCE en un `DerivOAuthService`.
2. Usar `https://auth.deriv.com/oauth2/auth` y `https://auth.deriv.com/oauth2/token`.
3. Separar `DERIV_CLIENT_ID` de cualquier `DERIV_APP_ID` Legacy/PAT.
4. Guardar `state` y `code_verifier` en Redis con TTL, asociados al usuario y sesión.
5. Cifrar tokens antes de persistirlos usando Laravel encrypter o una estrategia AES-256 equivalente con rotación definida.
6. Manejar scopes, cancelación, state inválido, código repetido y expiración.
7. Añadir servicio de revocación/desconexión y política de reautorización.
8. Redactar secretos, authorization codes y OTP de todos los logs.

**Aceptación:** OAuth funciona en demo con redirect HTTPS en staging y los tokens nunca aparecen en frontend, logs o respuestas API.

### Fase 5 — Integración Deriv REST y WebSocket

1. Implementar cuentas y OTP con Laravel HTTP Client:
   - `GET /trading/v1/options/accounts`
   - `POST /trading/v1/options/accounts/{accountId}/otp`
2. Normalizar la respuesta REST actual, incluida la envoltura `data`.
3. Crear un worker Artisan persistente para cada conexión Deriv autenticada.
4. Solicitar un OTP nuevo en cada conexión/reconexión.
5. Mantener el ciclo ping/pong, backoff, límite de reconexión y cancelación limpia.
6. Publicar eventos internos mediante canales privados Reverb por usuario/cuenta.
7. Guardar el estado de conexión y suscripciones en MySQL/Redis según su naturaleza.
8. Aislar demo y real por cuenta, token, URL y configuración.

**Aceptación:** una cuenta demo conecta, recibe ticks/balance/portfolio y se reconecta sin duplicar suscripciones.

### Fase 6 — Migración de endpoints de negocio

Migrar primero sin cambiar URLs públicas:

1. Auth y conexiones Deriv.
2. Cuentas y cuenta activa.
3. Market y ticks history.
4. Account data.
5. Watchlists.
6. Trading.

Cada dominio debe tener Controller, Service, Form Request, Resource/Transformer, Policy y pruebas. Mantener estas rutas:

```text
/api/auth/*
/api/deriv/connections/*
/api/deriv/accounts/*
/api/deriv/market/*
/api/deriv/account/*
/api/deriv/trade/*
/api/watchlists/*
```

Actualizar los adaptadores para la API actual de Deriv:

- `symbol` → `underlying_symbol`.
- `display_name` → `underlying_symbol_name`.
- `pip` → `pip_size`.
- Aceptar `string|number` en precios, payout y profit.
- No enviar `loginid` en operaciones nuevas.

**Aceptación:** React puede cambiar de Express a Laravel modificando solo `VITE_API_URL` y la URL del canal WebSocket, salvo ajustes menores de CSRF/Echo.

### Fase 7 — React y broadcasting

1. Conservar páginas, componentes, stores y TanStack Query.
2. Actualizar Axios para pedir CSRF y enviar cookies.
3. Sustituir el cliente WebSocket interno actual por Laravel Echo/Reverb o encapsularlo en el hook existente.
4. Mantener nombres de eventos internos para reducir cambios:
   - `deriv.account.balance.updated`
   - `deriv.account.portfolio.updated`
   - `deriv.market.tick`
   - `deriv.market.candle`
   - `deriv.trade.proposal`
   - `deriv.trade.buy`
   - `deriv.trade.sell`
   - `deriv.trade.open_contract`
   - `deriv.error`
5. Autorizar canales privados comprobando que el usuario sea dueño de la cuenta.
6. Probar logout, sesión expirada, cambio de cuenta y reconexión.

**Aceptación:** todas las páginas existentes funcionan contra Laravel y no reciben eventos de otra cuenta o usuario.

### Fase 8 — Coexistencia y cambio gradual

1. Ejecutar Express y Laravel en paralelo con bases de datos separadas o lectura controlada.
2. Usar un proxy/routing por entorno para enviar tráfico seleccionado a Laravel.
3. Comparar respuestas Express vs Laravel para usuarios de prueba.
4. Activar primero endpoints de lectura.
5. Activar OAuth y WebSocket demo.
6. Activar trading demo con límites.
7. Mantener Express como rollback durante un periodo acordado.
8. Migrar definitivamente cuando no haya diferencias críticas en métricas y contratos.

**Aceptación:** rollback a Express probado y documentado; no se pierden sesiones, cuentas ni auditoría.

## Estrategia de pruebas

- Unitarias: PKCE, cifrado, normalizadores, reglas de trading y policies.
- Integración: migraciones MySQL, Sanctum, rutas, validaciones y autorización.
- Contrato: respuestas REST de Deriv y eventos WebSocket.
- E2E: login → OAuth → cuentas → mercado → proposal → buy demo → contrato → sell demo.
- Seguridad: CSRF, CORS, cookies, rate limits, aislamiento multiusuario y redacción de logs.
- Regresión: comparar códigos HTTP, JSON y eventos con el backend Express.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Diferencias PostgreSQL/MySQL | Migración idempotente, checksums y pruebas con datos reales anonimizados |
| Pérdida de sesiones | Migrar sesiones o forzar re-login controlado durante cutover |
| WebSocket persistente en PHP | Worker supervisado, Redis, health checks y reconexión probada |
| Cambio de respuestas Deriv | Fixtures, JSON Schema y pruebas de contrato |
| Doble operación durante coexistencia | Un único backend propietario del trading por cuenta y locks distribuidos |
| Incompatibilidad Sanctum/CORS | Staging con dominios reales y prueba de cookies/CSRF antes del cambio |
| Exposición de tokens | Cifrado, logs redactados, secretos fuera del repo y rotación |

## Criterios de finalización

- Laravel y MySQL son el backend operativo principal.
- React funciona sin regresiones en sus rutas actuales.
- Todas las rutas críticas tienen pruebas y documentación.
- OAuth, OTP y WebSocket demo están validados.
- No hay secretos en repositorio, logs, bundle ni errores.
- Trading real permanece desactivado hasta aprobación explícita.
- Migración de datos, rollback y despliegue están documentados.
- CI ejecuta migraciones de prueba, lint, tests, build frontend y comprobación de secretos.
