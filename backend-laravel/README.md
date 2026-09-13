# Deriv Pro Laravel API

Backend Laravel paralelo para la migración de Deriv Pro. El backend Express original permanece en `../backend` mientras se completan las fases de migración.

## Estado actual

- Laravel 13.31.0 sobre PHP 8.3.29.
- Sanctum instalado y configurado para SPA con cookies stateful.
- Reverb instalado y broadcasting preparado.
- Predis instalado para Redis.
- `.env.example` preparado para MySQL, Redis y API de Deriv.
- Rutas disponibles: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` y `GET /api/user`.
- Autenticación local implementada con Sanctum stateful y compatibilidad de hash PBKDF2 con el backend Express.
- OAuth 2.0 + PKCE de Deriv implementado con state/verifier en cache y tokens cifrados.
- Sincronización de cuentas Deriv y generación de OTP por cuenta implementadas.
- Worker WebSocket persistente disponible como `php artisan deriv:ws {accountId}`.
- Reverb instalado y canal privado por usuario/cuenta preparado; React aún debe migrar su hook al cliente Echo.
- Endpoints Laravel para mercado y datos de cuenta implementados mediante requests puntuales por WebSocket.
- Aún no se han migrado todos los dominios de negocio ni datos productivos del backend Express.

## Configuración local

```powershell
Copy-Item .env.example .env
# Completar DB_* y crear la base de datos MySQL deriv_platform
php artisan key:generate
php artisan migrate
php artisan serve --port=8001
```

Antes del primer `migrate`, asegurar que `.env` tenga `DB_CONNECTION=mysql` y que exista la base `deriv_platform`.

## Tiempo real

En terminales separadas, con MySQL/Redis configurados:

```powershell
php artisan reverb:start
php artisan deriv:ws DOT90004580
```

El worker solicita un OTP nuevo, conecta al WebSocket de Deriv, envía heartbeat y publica eventos en el canal privado `deriv.{userId}.account.{accountId}`. No activar `DERIV_TRADING_ENABLED` hasta completar las pruebas demo.

Los endpoints de mercado/cuenta abren una conexión puntual con OTP, esperan la respuesta solicitada y cierran el socket; los streams en tiempo real continúan usando el worker.

Para usar Laragon cuando PHP no esté en el `PATH`:

```powershell
& 'C:\laragon\bin\php\php-8.3.29-Win32-vs16-x64\php.exe' artisan route:list --path=api
```

## Siguientes pasos

Seguir el plan en [../LARAVEL_MIGRATION_PLAN.md](../LARAVEL_MIGRATION_PLAN.md), comenzando por el worker WebSocket y la integración de Reverb antes de habilitar operaciones.
