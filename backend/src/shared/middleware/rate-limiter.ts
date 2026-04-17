import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveEndpointLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests to this endpoint' } },
  standardHeaders: true,
  legacyHeaders: false,
});
