import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { config } from './shared/config';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errors';
import { generalLimiter } from './shared/middleware';
import { InternalWebSocketServer } from './modules/deriv-ws/internal-ws.server';
import { DerivWsService } from './modules/deriv-ws/deriv-ws.service';

// Routes
import { authRouter } from './modules/auth/auth.routes';
import { derivAuthRouter } from './modules/deriv-auth/deriv-auth.routes';
import { derivAccountsRouter } from './modules/deriv-accounts/deriv-accounts.routes';
import { createDerivWsRoutes } from './modules/deriv-ws/deriv-ws.routes';
import { createMarketRoutes } from './modules/deriv-market/market.routes';
import { createAccountDataRoutes } from './modules/deriv-account-data/account-data.routes';
import { createTradeRoutes } from './modules/deriv-trade/trade.routes';
import { watchlistRouter } from './modules/watchlists/watchlist.routes';

const app = express();
const httpServer = createServer(app);

// ─── Internal WebSocket Server ───────────────────────────────────────────────
const internalWs = new InternalWebSocketServer();
internalWs.initialize(httpServer);

// ─── Deriv WS Service ────────────────────────────────────────────────────────
const derivWsService = new DerivWsService(internalWs);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Morgan logging -> Winston
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    wsClients: internalWs.getClientCount(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/auth', derivAuthRouter);
app.use('/api/deriv/accounts', derivAccountsRouter);
app.use('/api/deriv/accounts', createDerivWsRoutes(derivWsService));
app.use('/api/deriv/market', createMarketRoutes(derivWsService));
app.use('/api/deriv/account', createAccountDataRoutes(derivWsService));
app.use('/api/deriv/trade', createTradeRoutes(derivWsService));
app.use('/api/watchlists', watchlistRouter);

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
httpServer.listen(config.port, () => {
  logger.info(`🚀 Server running on ${config.appUrl}`);
  logger.info(`📡 Internal WebSocket on ws://localhost:${config.port}/ws/app`);
  logger.info(`🌐 Frontend expected at ${config.frontendUrl}`);
  logger.info(`📊 Environment: ${config.env}`);
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  await derivWsService.cleanup();
  internalWs.cleanup();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', { promise, reason });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export { app, httpServer };
