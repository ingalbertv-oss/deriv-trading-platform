# Deriv Pro Laravel API

Backend Laravel paralelo para la migración de Deriv Pro. El backend Express original permanece en `../backend` mientras se completan las fases de migración.

## Estado actual

- Laravel 13.31.0 sobre PHP 8.3.29.
- Sanctum instalado y configurado para SPA con cookies stateful.
- Reverb instalado y broadcasting preparado.
- Predis instalado para Redis.
- `.env.example` preparado para MySQL, Redis y API de Deriv.
- Rutas iniciales disponibles: `GET /api/health`, `GET /api/auth/me` y `GET /api/user`.
- Aún no se han migrado los dominios de negocio, modelos ni datos del backend Express.

## Configuración local

```powershell
Copy-Item .env.example .env
# Completar DB_* y crear la base de datos MySQL deriv_platform
php artisan key:generate
php artisan migrate
php artisan serve --port=8001
```

Para usar Laragon cuando PHP no esté en el `PATH`:

```powershell
& 'C:\laragon\bin\php\php-8.3.29-Win32-vs16-x64\php.exe' artisan route:list --path=api
```

## Siguientes pasos

Seguir el plan en [../LARAVEL_MIGRATION_PLAN.md](../LARAVEL_MIGRATION_PLAN.md), comenzando por las migraciones MySQL y autenticación local antes de integrar OAuth y WebSockets de Deriv.
