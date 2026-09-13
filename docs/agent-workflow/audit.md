# Auditoría del entorno de agentes

Fecha: 2026-09-13. Estado Git: rama `main`, árbol limpio (`git status --short`). Raíz confirmada con `git rev-parse --show-toplevel`: `C:/laragon/www/DERIV`.

## Evidencias

- `README.md`, `backend/package.json`, `frontend/package.json` y `backend-laravel/composer.json` confirman un repositorio con tres aplicaciones relacionadas.
- `backend/src/app.ts` monta Express, `/api`, `/health` y el WebSocket interno; `backend/prisma/schema.prisma` define persistencia PostgreSQL.
- `frontend/src/App.tsx` y `frontend/src/shared/hooks/useInternalWebSocket.ts` confirman rutas React y conexión al backend/Reverb legado.
- `backend-laravel/routes/api.php`, `app/Services/` y `app/Console/Commands/DerivWebSocketWorker.php` confirman la migración paralela Laravel, Sanctum/Reverb y worker Deriv.
- Solo existe `backend-laravel/AGENTS.md` (además de copias dentro de dependencias generadas). No había AGENTS raíz, `docs/agent-workflow`, `prompts`, `CHANGELOG.md`, configuración MCP ni skills del proyecto.
- `gitignore` excluye dependencias, builds, logs y entornos; se conservaron todos los cambios existentes.

## Verificaciones ejecutadas

- `backend`: `npm run build` — pasó.
- `frontend`: `npm run build` — pasó; Vite informó chunk minificado de 765.38 kB (>500 kB).
- `backend-laravel`: `php artisan test` usando PHP 8.3.29 de Laragon — 2/2 pasó.
- `php --version` y `composer --version` sin ruta configurada — bloqueo de PATH, no de la instalación local verificada.

## Hallazgos, impacto y acción

1. Hay dos backends y contratos/rutas parcialmente paralelos. Impacto: riesgo de editar el backend equivocado. Acción: documentar `backend/` como principal según README y Laravel como migración, exigiendo confirmar el target en cada cambio.
2. La integración Deriv, OAuth, WebSocket real y trading productivo no están verificadas sin credenciales/servicios. Impacto: los builds no prueban integraciones externas. Acción: mantenerlas como pendientes y usar cuenta demo/flag desactivado.
3. El lint de backend está declarado pero el README indica incompatibilidad con ESLint 10; no se corrigió porque sería cambio de tooling no necesario para esta preparación. Acción: registrar como pendiente.
4. No existe suite real en backend (`npm test` es placeholder). Impacto: cobertura limitada. Acción: exigir validación proporcional y no afirmar pruebas no ejecutadas.
5. No hay MCP de proyecto configurado ni credenciales disponibles. Acción: no añadir configuración incompleta; `mcp.md` documenta el estado y el procedimiento de evaluación.

## Alcance de esta preparación

Se crea la guía raíz, documentación operativa, prompts y trazabilidad. No se modifican lógica de negocio, contratos API, esquemas, dependencias ni configuración global del cliente.

## Reauditoría de fase siguiente

- Se añadió `backend/eslint.config.mjs` compatible con ESLint 10 y `typescript-eslint`; `npm run lint` pasa.
- `backend/tests/crypto.test.ts` cubre generación PKCE, vector RFC 7636, state y token; `npm test` pasa con 3 pruebas.
- Se corrigió el descarte de causa en `backend/src/modules/deriv-ws/deriv-ws.service.ts` sin alterar el contrato.
- `frontend/src/App.tsx` usa `lazy`/`Suspense`; el build se divide en chunks y ya no emite la advertencia del entry chunk >500 kB.
- `npm audit fix` se ejecutó sin `--force`; quedan 4 vulnerabilidades reportadas. No se forzó el cambio de Prisma sugerido por npm.
- `backend-laravel` respondió a `route:list --path=api` con 30 rutas y sus pruebas siguen en 2/2.
