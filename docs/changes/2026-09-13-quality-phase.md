# 2026-09-13 — calidad local y bundle

- Objetivo: cerrar pendientes locales de lint, pruebas y tamaño del bundle.
- Alcance realizado: configuración ESLint 10, pruebas PKCE, preservación de causas de error, code-splitting de rutas protegidas y actualización segura de dependencias auditables.
- Archivos afectados: `backend/package.json`, `backend/package-lock.json`, `backend/eslint.config.mjs`, `backend/tests/crypto.test.ts`, `backend/src/modules/deriv-ws/deriv-ws.service.ts`, `frontend/src/App.tsx`.
- Validaciones: backend lint/build/test correctos; frontend build correcto; Laravel route list y test correctos.
- Limitaciones: OAuth/WebSocket real requiere credenciales y cuenta demo; migración Laravel requiere decisión de cutover e infraestructura; quedan 4 avisos npm, incluido uno con corrección incompatible.
- Próximo paso: habilitar un entorno demo aislado y ejecutar pruebas de contrato sin activar trading real.
