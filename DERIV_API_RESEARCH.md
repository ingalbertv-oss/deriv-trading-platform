# Investigación actual de las APIs de Deriv

**Fecha de consulta:** 12 de septiembre de 2026  
**Fuentes:** documentación oficial publicada en `developers.deriv.com`.

## Resumen ejecutivo

Deriv mantiene una arquitectura moderna dividida en REST y WebSocket para la plataforma Options:

- REST se usa para cuentas, configuración y obtención del WebSocket autenticado.
- WebSocket se usa para mercado en tiempo real, datos de cuenta, suscripciones y ejecución de operaciones.
- La autenticación soporta OAuth 2.0 con PKCE y PAT.
- Las conexiones autenticadas ya no se establecen con un token directo en el socket: primero se solicita un OTP por REST, válido 120 segundos y de un solo uso.
- La documentación actual conserva los nombres operativos `active_symbols`, `ticks_history`, `proposal`, `buy`, `sell`, `portfolio`, `balance`, `statement`, etc., pero especifica cambios importantes frente a la API Legacy.

Fuentes principales: [API Overview](https://developers.deriv.com/docs/intro/api-overview/), [Authentication](https://developers.deriv.com/docs/intro/authentication/) y [Options REST API](https://developers.deriv.com/docs/options/).

## Endpoints y flujo vigente

### OAuth 2.0

La documentación actual define:

- Authorization: `https://auth.deriv.com/oauth2/auth`
- Token exchange: `POST https://auth.deriv.com/oauth2/token`
- API base: `https://api.derivws.com`
- Parámetros obligatorios: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge` y `code_challenge_method=S256`.
- El `redirect_uri` debe estar registrado exactamente y debe usar HTTPS en el entorno real.
- Los scopes publicados incluyen `trade`, `account_manage`, `application_read` y `payment`.
- El intercambio del código debe hacerse en backend; el código es de un solo uso y expira rápidamente.

Fuente: [OAuth 2.0](https://developers.deriv.com/docs/intro/oauth/).

### Cuentas Options y OTP

La API REST actual publica:

```text
GET  /trading/v1/options/accounts
POST /trading/v1/options/accounts/{accountId}/otp
```

El endpoint de cuentas requiere scope `trade`; el endpoint OTP también requiere `trade`. La respuesta OTP entrega una URL lista para conectar:

```text
wss://api.derivws.com/trading/v1/options/ws/demo?otp=...
wss://api.derivws.com/trading/v1/options/ws/real?otp=...
```

También existe un canal público sin autenticación:

```text
wss://api.derivws.com/trading/v1/options/ws/public
```

Ese canal público sirve para datos de mercado, pero no permite consultar balances ni ejecutar operaciones.

Fuente: [Options WebSockets](https://developers.deriv.com/docs/options/websocket/) y [Get All Accounts](https://developers.deriv.com/docs/options/get-accounts/).

### Operaciones WebSocket

La documentación actual mantiene estas operaciones relevantes para el proyecto:

- Mercado: `active_symbols`, `ticks`, `ticks_history`, `trading_times`.
- Cuenta: `authorize`, `balance`, `portfolio`, `statement`, `profit_table`, `transaction`.
- Trading: `proposal`, `buy`, `sell`, `proposal_open_contract`.
- Suscripciones: actualizaciones de ticks, balance, transacciones y contratos abiertos.

El workflow oficial recomendado es: autorizar conexión → obtener símbolos → suscribirse a ticks → pedir proposal → comprar → suscribirse al contrato abierto → vender opcionalmente → consultar portfolio.

Fuente: [Complete Workflows](https://developers.deriv.com/docs/workflows/) y [Trading Operations](https://developers.deriv.com/docs/trading/).

## Cambios frente a Legacy que afectan al proyecto

La documentación oficial incluye comparativas explícitas entre Legacy y New API:

| Área | Cambio actual | Impacto esperado |
|---|---|---|
| OAuth | `auth.deriv.com/oauth2/auth` usa `client_id`; `app_id` solo se menciona como compatibilidad Legacy | Revisar que el proyecto no use `DERIV_APP_ID` como `client_id` de OAuth |
| Active symbols | `symbol` pasa a `underlying_symbol`; `display_name` pasa a `underlying_symbol_name`; `pip` pasa a `pip_size` | Actualizar tipos, adaptador y UI |
| Proposal | `symbol` pasa a `underlying_symbol`; se eliminan parámetros Legacy; varios precios pueden ser `string \| number` | Revisar payloads, validación y conversiones numéricas |
| Buy | `loginid` fue eliminado | No enviarlo y mantener selección de cuenta por token/socket |
| Open contract | Muchos valores pueden ser `string \| number`; `payout` se documenta como string | Evitar asumir siempre `number` |
| Account endpoints | La cuenta se determina por el token/socket actual; hay cambios de campos y eliminación de multi-account Legacy | Revisar modelos y normalizadores |
| Legacy data | Las rutas Legacy quedan para datos históricos pre-migración y pueden devolver `409` durante migración | No usarlas para operaciones actuales |

Fuentes: [Proposal comparison](https://developers.deriv.com/comparison/proposal/), [Buy comparison](https://developers.deriv.com/comparison/buy/), [Open contract comparison](https://developers.deriv.com/comparison/proposal-open-contract/), [Active symbols comparison](https://developers.deriv.com/comparison/active-symbols/) y [Legacy Options API](https://developers.deriv.com/docs/options-legacy/).

## Comparación con la implementación local

### Hallazgos de prioridad alta

1. `backend/src/shared/config/index.ts` tiene como valor por defecto `https://oauth.deriv.com`, mientras que la documentación actual publica `https://auth.deriv.com`.
2. `DerivAuthService.startOAuth()` usa `config.deriv.appId` como valor de `client_id`, mientras que el proyecto también define `DERIV_CLIENT_ID` y lo usa después durante el intercambio del token. Debe confirmarse cuál credencial corresponde a la aplicación OAuth nueva.
3. La URL construida localmente usa `/oauth2/authorize`; la documentación actual usa `/oauth2/auth`. Esto debe verificarse y corregirse antes de probar OAuth real.
4. El adaptador y los tipos locales usan nombres Legacy como `symbol`, `loginid` y varios campos numéricos estrictamente `number`. Deben contrastarse con payloads reales de la New API.
5. `fetchAndStoreAccounts()` asume `response.data.accounts || response.data`, pero los ejemplos REST actuales usan una envoltura `data`; hay que validar el esquema exacto de la respuesta GET y agregar pruebas de contrato.

### Hallazgos de prioridad media

1. El proyecto ya solicita OTP mediante `POST /trading/v1/options/accounts/{accountId}/otp` y usa la URL devuelta, lo cual coincide conceptualmente con el flujo oficial.
2. El proyecto añade `Deriv-App-ID` incluso en requests OAuth. La documentación indica que ese header es obligatorio para PAT y no necesario para OAuth; no necesariamente rompe la llamada, pero conviene distinguir ambos modos.
3. El proyecto configura `wss://ws.derivws.com/websockets/v3` como WebSocket público por defecto. La documentación actual publica `wss://api.derivws.com/trading/v1/options/ws/public`; debe actualizarse si esa variable se usa realmente.
4. La implementación espera opcionalmente `refresh_token`. La guía OAuth consultada muestra `access_token`, `expires_in` y `token_type`; se debe confirmar la política real de renovación y diseñar expiración/reautorización sin depender de un refresh token no garantizado.

## Acciones recomendadas

1. Descargar y versionar como referencia de desarrollo los esquemas oficiales publicados en [deriv-api-schemas](https://github.com/deriv-com/deriv-api-schemas/releases/latest/download/schemas.zip).
2. Confirmar en el panel de Deriv si la aplicación es OAuth 2.0 nueva, Legacy o ambas.
3. Corregir y probar primero `auth.deriv.com/oauth2/auth`, `client_id` y `scope=trade`.
4. Crear fixtures anonimizados de respuestas actuales para accounts, active symbols, proposal, buy, portfolio y open contract.
5. Cambiar tipos/adaptadores para aceptar `string | number` y los nombres `underlying_symbol*`.
6. Probar todo en cuenta demo; bloquear por configuración cualquier operación real durante la auditoría.
7. Añadir pruebas de contrato que fallen si Deriv vuelve a cambiar campos o envolturas de respuesta.

## Conclusión

La integración local está encaminada en la arquitectura general, especialmente en el uso de REST para OTP y WebSocket para trading. Sin embargo, no debe considerarse compatible todavía con la API actual hasta validar el flujo OAuth y actualizar los modelos/adaptadores que parecen conservar supuestos de Legacy.
