import { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';
import { logger } from '../logger';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
