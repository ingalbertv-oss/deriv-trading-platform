# Plan de mejora e integración con la API actual de Deriv

## Objetivo

Alinear Deriv Pro con la API actual de Deriv Options, validar el flujo completo en cuenta demo y dejar una base segura para producción sin habilitar operaciones reales hasta superar los controles de aceptación.

## Resultado esperado

```text
OAuth 2.0 + PKCE
        ↓ access token
REST accounts + OTP
        ↓ URL WebSocket por cuenta
WebSocket demo/real
        ↓ eventos normalizados
Frontend: mercado → proposal → buy → contrato abierto → sell
```

## Fase 0 — Congelación y seguridad

Antes de cambiar integración:

1. Crear una rama de trabajo específica.
2. Revisar `frontend/.env.production`, `.gitignore` y el historial Git para confirmar que no haya secretos.
3. Rotar cualquier credencial que haya sido expuesta.
4. Añadir una bandera explícita `DERIV_TRADING_ENABLED=false` por defecto.
5. Impedir por configuración que entornos de desarrollo apunten a cuentas reales.
6. Guardar fixtures anonimizados de respuestas Deriv sin tokens ni datos personales.

**Aceptación:** no existen secretos versionados y cualquier intento de trading real queda bloqueado por configuración.

## Fase 1 — Corrección de configuración OAuth

Archivos principales: `backend/src/shared/config/index.ts` y `backend/src/modules/deriv-auth/deriv-auth.service.ts`.

1. Separar claramente:
   - `DERIV_CLIENT_ID`: OAuth 2.0 `client_id`.
   - `DERIV_APP_ID`: solo compatibilidad Legacy o header PAT cuando aplique.
2. Cambiar el endpoint de autorización a `https://auth.deriv.com/oauth2/auth`.
3. Mantener el intercambio en `POST https://auth.deriv.com/oauth2/token`.
4. Construir el scope explícitamente, comenzando con `trade`.
5. Verificar que `redirect_uri` coincida exactamente con el registrado.
6. Manejar respuestas OAuth con error, cancelación, state inválido, código repetido y expiración.
7. No registrar `code`, tokens, `code_verifier` ni URLs que contengan credenciales.
8. Sustituir el mapa de PKCE en memoria por almacenamiento compartido con TTL cuando haya más de una instancia del backend.

**Aceptación:** login OAuth exitoso en demo, state/PKCE inválidos rechazados y tokens persistidos cifrados.

## Fase 2 — Contratos REST de cuentas y OTP

Archivos principales: `deriv-auth.service.ts`, `deriv-ws.service.ts` y tipos de `deriv-shared`.

1. Confirmar el esquema real de `GET /trading/v1/options/accounts` y su envoltura `data`.
2. Normalizar respuestas 200, 401, 403, 404, 429, 500 y 504.
3. Aceptar el header `Deriv-App-ID` solo para PAT; no depender de él para OAuth.
4. Solicitar OTP con `POST /trading/v1/options/accounts/{accountId}/otp`.
5. Leer la URL desde `response.data.url` y conectarse inmediatamente.
6. No almacenar el OTP ni escribirlo en logs.
7. Renovar OTP en cada reconexión; nunca reutilizar la URL anterior.
8. Persistir el tipo de cuenta demo/real y rechazar inconsistencias entre cuenta y endpoint.

**Aceptación:** listado de cuentas correcto, conexión demo exitosa y reconexión funcional después de expirar/cerrar el socket.

## Fase 3 — Actualización de tipos y adaptadores

Archivos principales: `backend/src/modules/deriv-shared/deriv.types.ts`, `deriv.adapter.ts` y consumidores frontend.

1. Cambiar nombres Legacy a los actuales:
   - `symbol` → `underlying_symbol`.
   - `symbol_type` → `underlying_symbol_type`.
   - `display_name` → `underlying_symbol_name`.
   - `pip` → `pip_size`.
2. Mantener un adaptador de compatibilidad solo si se requiere soportar respuestas Legacy.
3. Convertir de forma segura `string | number` a números internos en precios, payout, profit y balance.
4. Usar `unknown` + validación de esquema en los bordes, evitando `any` en servicios críticos.
5. Tolerar campos opcionales y respuestas parciales sin romper el WebSocket interno.
6. Añadir `req_id` correlacionable para cada solicitud y asociarlo a errores/respuestas.

**Aceptación:** fixtures New API pasan sin transformaciones implícitas y los componentes visuales muestran valores correctos.

## Fase 4 — Mercado y suscripciones

1. Validar `active_symbols` usando los nombres actuales.
2. Usar `ticks` para precios en tiempo real; no depender de spot incluido en `active_symbols`.
3. Revisar `ticks_history`, `candles`, `trading_times` y sus parámetros actuales.
4. Registrar el `subscription.id` por cuenta y cancelar suscripciones explícitamente.
5. Evitar fugas de suscripciones al cambiar de símbolo, cuenta o pantalla.
6. Distinguir respuestas one-shot de streams persistentes.
7. Probar reconexión y re-suscripción con backoff y límite máximo.

**Aceptación:** mercado carga símbolos, precio en tiempo real e histórico; cambiar de símbolo no duplica streams.

## Fase 5 — Trading seguro

Archivos principales: `trade.routes.ts`, `deriv-ws.service.ts` y `TradingPanel.tsx`.

1. Validar proposal con `underlying_symbol` y campos compatibles con New API.
2. Verificar que la propuesta exista antes de comprar y que no esté vencida.
3. Enviar `buy` sin `loginid`; la cuenta la determina el socket autenticado.
4. Validar `price`, moneda, stake, contrato y límites en backend, no solo en frontend.
5. Requerir confirmación visual antes de comprar.
6. Usar idempotencia/correlación para evitar doble compra por reintentos o doble clic.
7. Suscribirse a `proposal_open_contract` después de comprar.
8. Permitir `sell` únicamente para contratos pertenecientes a la cuenta activa.
9. Registrar auditoría con usuario, cuenta, acción, request id, contrato y resultado, sin tokens.
10. Mantener `DERIV_TRADING_ENABLED=false` hasta completar todas las pruebas demo.

**Aceptación:** flujo demo completo proposal → buy → seguimiento → sell, con errores y desconexiones controlados.

## Fase 6 — API interna y frontend

1. Documentar los contratos internos REST y WebSocket del backend.
2. Homogeneizar estados: `loading`, `ready`, `stale`, `reconnecting`, `error` y `unauthorized`.
3. Invalidar consultas TanStack Query al cambiar cuenta o cerrar sesión.
4. Limpiar estado Zustand al cambiar de usuario/cuenta.
5. Mostrar claramente demo vs real, cuenta activa, moneda y riesgo de la operación.
6. Deshabilitar botones durante requests y mostrar confirmación de resultado.
7. Añadir manejo de sesión expirada y reconexión del WebSocket interno.
8. Revisar accesibilidad, responsive y formato de valores `string | number`.

**Aceptación:** un usuario puede recorrer el flujo sin refrescar manualmente ni quedar con estado de otra cuenta.

## Fase 7 — Calidad, pruebas y observabilidad

1. Añadir configuración ESLint compatible con ESLint 10.
2. Sustituir el test placeholder por:
   - unit tests de PKCE, cifrado y adaptadores;
   - integración de auth, cuentas, OTP y watchlists;
   - tests de contrato para respuestas Deriv;
   - E2E en demo para el flujo de trading.
3. Añadir timeout, retry controlado y circuit breaker para REST.
4. Definir métricas de latencia, errores Deriv, reconexiones y suscripciones activas.
5. Añadir correlation ID entre frontend, backend y requests Deriv.
6. Configurar alertas para errores de autenticación, sockets y operaciones.
7. Revisar `npm audit`, lockfiles y actualización de dependencias.

**Aceptación:** CI ejecuta build, lint, tests y comprobaciones de secretos; los fallos de contrato bloquean el merge.

## Orden recomendado de implementación

1. Fase 0: seguridad y bandera de trading.
2. Fase 1: OAuth y credenciales correctas.
3. Fase 2: cuentas/OTP.
4. Fase 3: tipos y adaptadores.
5. Fase 4: mercado/suscripciones.
6. Fase 5: trading demo.
7. Fase 6: frontend y estados.
8. Fase 7: automatización, observabilidad y release.

## Criterios para pasar a producción

- OAuth real validado con redirect HTTPS.
- Cuentas demo y real correctamente diferenciadas.
- Ningún secreto en repositorio, logs, bundle o errores.
- Tests de contrato y E2E demo aprobados.
- Buy/sell protegidos contra duplicados, cuenta incorrecta y sesión expirada.
- Auditoría de cada operación disponible.
- CI verde y rollback documentado.
- Revisión manual de seguridad y aprobación explícita antes de activar `DERIV_TRADING_ENABLED=true`.
