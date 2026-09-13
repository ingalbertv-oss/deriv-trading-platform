# Revisar cambios

## Objetivo
Revisar `[CAMBIO/DIFF]` buscando defectos y riesgos antes de integrarlo.

## Datos del usuario
Alcance esperado, prioridad de riesgos y entorno de validación.

## Leer
`AGENTS.md`, documentación del área, `architecture.md`, `testing.md`, diff completo, consumidores, contratos, migraciones y tests afectados.

## Trabajo
Comprobar corrección, regresiones, auth/permisos, secretos, compatibilidad, manejo de errores, observabilidad y validaciones. Priorizar hallazgos accionables con evidencia.

## Límites
No reescribir el cambio ni asumir requisitos ausentes. No llamar servicios externos con credenciales reales.

## Entrega
Hallazgos ordenados por severidad con archivo/línea y recomendación; luego aspectos verificados, pruebas ejecutadas y riesgos pendientes. Si no hay hallazgos, decirlo con las limitaciones de la revisión.
