# Logging y trazabilidad

## Laravel

El canal `daily` escribe en `backend-laravel/storage/logs/laravel.log` y conserva 14 días según `.env.example`. Cada request del grupo API registra `request_id`, método, ruta, estado, duración y usuario autenticado, y devuelve el mismo identificador en `X-Request-Id`.

Para observarlo desde `backend-laravel/`:

```powershell
Get-Content storage\logs\laravel.log -Wait
```

No se registran cuerpos de request, cookies, tokens, contraseñas ni query strings.

## Backend Express

El logger existente escribe `backend/logs/combined.log` y `backend/logs/error.log`. No mezclar estos archivos con los de Laravel: son procesos y backends distintos.

## Frontend

El navegador registra eventos estructurados en DevTools mediante `frontend/src/shared/logger/index.ts`. Las llamadas Axios incluyen `X-Request-Id` y registran inicio, resultado, estado y duración. Los logs del navegador no pueden escribirse directamente en `frontend/logs` por las restricciones de seguridad del navegador; la persistencia queda en el backend Laravel.

Para investigar una operación, buscar el mismo `request_id` en la consola del navegador y en `backend-laravel/storage/logs/laravel.log`.
