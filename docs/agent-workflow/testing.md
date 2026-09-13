# Validación proporcional

| Cambio | Validación mínima |
|---|---|
| Documentación/prompts | comprobar rutas, enlaces, ausencia de secretos y diff |
| Backend TypeScript | `cd backend; npm run build`; `npm test` solo evidencia placeholder |
| Frontend | `cd frontend; npm run build`; registrar advertencias Vite |
| Laravel | PHP 8.3.29 de Laragon + `php artisan test`; `route:list` para rutas |
| API/auth/permisos | tests o smoke inocuo local, revisar middleware, cookies y CORS |
| Prisma/migraciones | revisión de schema/migration y plan; no ejecutar contra base compartida |
| Deriv/WebSocket/trading | cuenta demo, credenciales seguras y prueba explícita; trading sigue bloqueado por flag |

No declarar éxito de integraciones externas sin respuesta observada. Registrar comandos, directorio, resultado y pendientes.
