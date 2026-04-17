import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors';
import prisma from '../database/prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionId?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      throw new UnauthorizedError('No session token provided');
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid session');
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError('Session expired');
    }

    req.userId = session.userId;
    req.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
}
