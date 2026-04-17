import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'crypto';
import prisma from '../../shared/database/prisma';
import { generateSessionToken } from '../../shared/crypto';
import { authMiddleware, AuthenticatedRequest, authLimiter } from '../../shared/middleware';
import { BadRequestError, UnauthorizedError } from '../../shared/errors';
import { config } from '../../shared/config';
import { AuditService } from '../audit-logs/audit.service';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      password: z.string().min(8).max(100),
    });

    const { name, email, password } = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError('Email already registered');
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + config.session.maxAge);

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt,
      },
    });

    // Set HttpOnly cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      maxAge: config.session.maxAge,
      path: '/',
    });

    await AuditService.log({
      userId: user.id,
      domain: 'auth',
      action: 'register',
      message: 'User registered',
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const { email, password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + config.session.maxAge);

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt,
      },
    });

    // Set HttpOnly cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      maxAge: config.session.maxAge,
      path: '/',
    });

    await AuditService.log({
      userId: user.id,
      domain: 'auth',
      action: 'login',
      message: 'User logged in',
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId) {
      await prisma.session.delete({ where: { id: req.sessionId } });
    }

    res.clearCookie('session_token', { path: '/' });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deriv/status
 */
router.get('/deriv/status', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { DerivAuthService } = await import('../deriv-auth/deriv-auth.service');
    const status = await DerivAuthService.getStatus(req.userId!);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deriv/connections
 */
router.get('/deriv/connections', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { DerivAuthService } = await import('../deriv-auth/deriv-auth.service');
    const connections = await DerivAuthService.getConnections(req.userId!);
    res.json({ success: true, data: connections });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/deriv/connections/:id
 */
router.delete('/deriv/connections/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { DerivAuthService } = await import('../deriv-auth/deriv-auth.service');
    await DerivAuthService.disconnect(req.userId!, req.params.id as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
