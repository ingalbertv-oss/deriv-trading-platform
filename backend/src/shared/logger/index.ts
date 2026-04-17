import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Filter out sensitive data
  const safeMeta = { ...meta };
  const sensitiveKeys = ['password', 'token', 'secret', 'access_token', 'refresh_token', 'authorization'];
  for (const key of sensitiveKeys) {
    if (safeMeta[key]) safeMeta[key] = '[REDACTED]';
  }

  const metaStr = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'deriv-platform' },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
