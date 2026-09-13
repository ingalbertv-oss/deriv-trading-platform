# Arquitectura operativa

## Flujo principal confirmado

`frontend/` consume la API del backend y el canal de tiempo real. `backend/` expone Express `/api`, usa Prisma/PostgreSQL, encapsula OAuth/PKCE, Deriv REST/WebSocket y publica `/ws/app`. `backend-laravel/` replica/migra capacidades hacia Laravel, Sanctum, Reverb, MySQL/Redis y un worker persistente.

## Fronteras

- UI, stores y hooks permanecen en `frontend/src`.
- Rutas y servicios por dominio permanecen en `backend/src/modules`; utilidades compartidas en `backend/src/shared`.
- Laravel mantiene sus rutas, controladores, servicios, modelos, migraciones y comandos dentro de `backend-laravel/`.
- El frontend no debe contener secretos ni conectarse directamente a Deriv.

## Diferencias de estado

El README raíz describe Express como backend principal. Laravel es paralelo y aún no cubre todos los dominios productivos. No asumir equivalencia de endpoints, persistencia o tiempo real entre ambos.
