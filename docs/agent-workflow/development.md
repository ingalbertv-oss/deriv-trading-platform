# Desarrollo

## Backend TypeScript

Desde `backend/`: `npm install` (solo si faltan dependencias), `npm run dev`, `npm run build`, `npm run start`. Prisma: `npm run db:generate`, `db:push`, `db:migrate`, `db:seed`, `db:studio`; son operaciones con efectos y requieren confirmar el entorno.

## Frontend

Desde `frontend/`: `npm install`, `npm run dev`, `npm run build`, `npm run preview`. Variables se toman de `frontend/.env.example`; ninguna `VITE_*` debe contener secretos.

## Laravel paralelo

Desde `backend-laravel/`, con el PHP de Laragon si hace falta: `php artisan serve --port=8001`, `php artisan route:list --path=api`, `php artisan test`. El setup del README Laravel requiere MySQL y puede migrar datos; no ejecutarlo automáticamente.

Mantener cambios por módulo, reutilizar validadores/servicios y actualizar documentación si cambia un contrato o flujo operativo.
