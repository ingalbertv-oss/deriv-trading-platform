# Changelog

## No publicado

- Añadida guía raíz para agentes y documentación del flujo de desarrollo.
- Añadidos prompts reutilizables para auditoría, planificación, implementación, diagnóstico, revisión, cierre y continuidad.
- Registrada la auditoría inicial y las validaciones ejecutadas.
- Configurado lint TypeScript con ESLint 10 y reemplazado el test placeholder del backend por pruebas PKCE.
- Preservada la causa de errores WebSocket y aplicada carga diferida a páginas protegidas del frontend.
- Ejecutado `npm audit fix` sin `--force`; permanecen avisos que requieren revisión de compatibilidad.
- Añadido logging correlacionable para Laravel y frontend mediante `X-Request-Id`, con rotación diaria de logs Laravel.
