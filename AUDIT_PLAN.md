# Plan de auditoría del proyecto Deriv Pro

## Objetivo

Determinar con evidencia qué partes están implementadas, cuáles funcionan de extremo a extremo, qué riesgos impiden producción y qué trabajo debe priorizarse.

## Línea base observada

- `backend`: Express + TypeScript + Prisma + PostgreSQL + WebSocket.
- `frontend`: React + Vite + TypeScript.
- Los builds de backend y frontend pasan al 12/09/2026.
- El lint del backend no pasa por ausencia de configuración ESLint 10.
- Las pruebas automatizadas no están implementadas; el script actual es un placeholder.
- Existen cambios locales en `frontend/.gitignore` y `frontend/.env.production`; deben revisarse antes de publicar.

## Fases

### 1. Inventario y reproducibilidad

1. Confirmar versiones de Node, npm, Prisma, TypeScript y Vite.
2. Comparar README, `.env.example`, scripts y configuración real.
3. Levantar backend, frontend y PostgreSQL desde una copia limpia.
4. Registrar comandos, versiones, errores y requisitos faltantes.

**Salida:** matriz de componentes con estado `funciona`, `parcial`, `bloqueado` o `no implementado`.

### 2. Calidad de código

1. Añadir configuración ESLint compatible con ESLint 10 y ejecutar lint.
2. Revisar tipado laxo (`any`), manejo de errores, duplicación y convenciones.
3. Revisar separación de módulos, dependencias y contratos API.
4. Eliminar código inicial no utilizado y documentación obsoleta.

**Salida:** informe de defectos por severidad y deuda técnica priorizada.

### 3. Backend, API y base de datos

1. Probar `/health` y cada endpoint autenticado con usuario válido e inválido.
2. Verificar autorización por usuario para cuentas, watchlists, conexiones y transacciones.
3. Validar esquemas Zod, códigos HTTP, errores y límites de payload/rate limit.
4. Revisar migraciones, índices, cascadas, cachés y consistencia de `BigInt`/JSON.
5. Confirmar que las acciones de trading generan auditoría e idempotencia suficientes.

**Salida:** colección reproducible de pruebas API y lista de contratos corregidos.

### 4. Integración Deriv y WebSockets

1. Probar OAuth completo: start, callback, `state`, PKCE, rechazo de errores y sesión.
2. Validar cifrado/descifrado, expiración y revocación de tokens.
3. Probar conexión, autenticación, ping/pong, reconexión y limpieza de sockets.
4. Validar símbolos, ticks, historial, balance, portfolio y statement contra respuestas reales.
5. Ejecutar proposal/buy/sell únicamente en cuenta demo y comprobar duplicados o desconexiones.
6. Verificar aislamiento entre usuarios y cuentas activas.

**Salida:** evidencia de pruebas E2E en demo, con payloads anonimizados y fallos conocidos.

### 5. Frontend y experiencia de usuario

1. Recorrer login, callback, dashboard, accounts, market, detalle, history y settings.
2. Verificar estados de carga, error, vacío, reconexión y sesión expirada.
3. Comprobar que las rutas protegidas no exponen datos sin autenticación.
4. Revisar responsive, accesibilidad básica, formato de moneda/fecha y confirmaciones de trading.
5. Medir bundle y aplicar code splitting si el rendimiento lo requiere.

**Salida:** checklist visual y backlog UX con capturas/reproducción.

### 6. Seguridad y operación

1. Auditar secretos, `.env.production`, historial Git y reglas de ignore.
2. Revisar cookies Secure/SameSite, CORS, CSRF, CSP, Helmet y exposición de errores.
3. Verificar logs sin tokens ni datos personales, rotación y retención de auditoría.
4. Revisar dependencias con `npm audit` y definir política de actualización.
5. Definir HTTPS, dominio, variables de producción, backups, observabilidad y rollback.

**Salida:** matriz de riesgos, controles faltantes y checklist de release.

### 7. Pruebas automatizadas y release

1. Reemplazar el test placeholder por pruebas unitarias de servicios y adaptadores.
2. Añadir integración de rutas con base de datos de prueba.
3. Añadir E2E del flujo: login → conectar Deriv → seleccionar cuenta → consultar mercado → proposal.
4. Añadir pruebas de regresión para buy/sell en mock y demo.
5. Crear CI con build, lint, tests, migración validada y verificación de secretos.

**Salida:** pipeline reproducible y criterios de aprobación de release.

## Priorización

1. **Bloqueantes:** secretos/configuración de producción, autorización, OAuth real, trading seguro y WebSocket.
2. **Alta:** tests, lint, manejo de errores, expiración de sesión/token y auditoría de operaciones.
3. **Media:** accesibilidad, responsive, bundle splitting, documentación API y observabilidad.
4. **Baja:** limpieza de assets/código inicial y mejoras cosméticas.

## Criterios de cierre

La auditoría termina cuando cada módulo tiene evidencia de ejecución, riesgos con responsable y prioridad, el flujo crítico pasa en demo, no hay secretos expuestos, CI ejecuta build/lint/tests y existe una decisión explícita de `apto`, `apto con riesgos` o `no apto` para producción.
