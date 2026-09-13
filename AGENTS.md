# DERIV — guía operativa para agentes

## Contexto y mapa

Deriv Pro es una plataforma full-stack para mercados, cuentas y contratos Deriv.

- `frontend/`: React + Vite + TypeScript; interfaz y estado cliente.
- `backend/`: Express + TypeScript + Prisma; backend actualmente documentado como principal, API `/api` y WebSocket `/ws/app`.
- `backend-laravel/`: backend Laravel 13 paralelo de migración; Sanctum, Reverb, MySQL/Redis y worker Deriv.
- Documentación operativa: `docs/agent-workflow/`; planes históricos en la raíz.

Lee primero este archivo y después `docs/agent-workflow/status.md`, `architecture.md` y el documento específico del área. Para Laravel también aplica `backend-laravel/AGENTS.md`.

## Comandos comprobados

Ejecuta cada comando desde su directorio indicado:

- `backend/`: `npm run build`, `npm run dev`, `npm run lint`, `npm test`.
- `frontend/`: `npm run build`, `npm run dev`, `npm run preview`.
- `backend-laravel/`: `php artisan test`, `php artisan route:list --path=api`, `php artisan serve --port=8001`.

En esta máquina PHP no está en `PATH`; el ejecutable verificado está bajo `C:\laragon\bin\php\php-8.3.29-Win32-vs16-x64\php.exe`.
No ejecutes migraciones, `db:push`, despliegues ni trading real sin autorización explícita y entorno seguro.

## Límites y convenciones

Conserva la separación frontend/API y las fronteras por módulos. El frontend no debe llamar directamente a Deriv. Cambios de contrato API, persistencia, autenticación, permisos o WebSocket requieren revisión de impacto antes de editar y documentación asociada.

Nunca versionar `.env`, tokens, claves, cookies ni datos personales. Usa `.env.example` solo como catálogo de variables. Respeta cookies HttpOnly, CORS con credenciales, PKCE/state y cifrado existentes.

## Validación y entrega

Antes de editar, identifica archivos de entrada, consumidores y riesgos. Para cambios backend ejecuta al menos `npm run build`; para frontend `npm run build`; para Laravel usa PHP de Laragon y `php artisan test` cuando sea aplicable. Si cambia API, datos, auth o tiempo real, añade las comprobaciones específicas indicadas en `docs/agent-workflow/testing.md`.

Actualiza documentación y `CHANGELOG.md` solo por cambios reales. Para una fase relevante crea un registro en `docs/changes/`. Entrega: objetivo, alcance realizado, archivos, validaciones con resultado, pendientes/bloqueos, riesgos y siguiente paso.

Prompts reutilizables están en `prompts/`; usa `07-retomar-trabajo.md` al continuar una fase.
