# API de mercado Laravel para GPT

## Objetivo

Incorporar el primer corte read-only del backend Laravel para entregar contexto de mercado normalizado a un analista GPT sin exponer credenciales de Deriv.

## Alcance

- Configuración centralizada de URLs Deriv, PAT y clave interna GPT.
- Middleware `auth.gpt` con Bearer independiente y rate limit de 60 solicitudes por minuto.
- Proveedor `MarketDataProvider` desacoplado y cliente público WebSocket Deriv.
- DTO UTC de velas, enum de timeframes M15/M30/H1/H4/D1.
- Indicadores EMA, RSI, ATR y rangos; pivotes fractales y BOS confirmado por cierre.
- Endpoints versionados para instrumentos, contexto completo, contexto compacto, velas y ticks.
- Endpoints read-only opcionales para resumen de cuenta y posiciones mediante PAT exclusivamente servidor.
- Health check con estado de base de datos, Redis y configuración Deriv.
- Pruebas de autenticación y de umbrales del motor técnico.

## Pendientes

La ejecución efectiva requiere infraestructura Redis/MySQL y credenciales autorizadas para validar contra Deriv demo. No se ejecutaron migraciones, trading ni conexiones reales.
