import { Router, Request, Response, NextFunction } from 'express';
import { DerivAuthService } from './deriv-auth.service';
import { authMiddleware, AuthenticatedRequest, authLimiter } from '../../shared/middleware';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';

const router = Router();

/**
 * GET /api/auth/deriv/start
 * Initiates OAuth flow and redirects to Deriv
 */
router.get('/deriv/start', authLimiter, authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { authorizationUrl, state } = DerivAuthService.startOAuth(req.userId!);
    res.json({ success: true, data: { authorizationUrl, state } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/deriv/callback
 * Handles OAuth callback from Deriv
 */
router.get('/deriv/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };

    if (!code || !state) {
      res.redirect(`${config.frontendUrl}/auth/deriv/callback?error=missing_params`);
      return;
    }

    const { userId, connectionId } = await DerivAuthService.handleCallback(code, state);

    // Redirect to frontend with success
    res.redirect(`${config.frontendUrl}/auth/deriv/callback?status=success&connection=${connectionId}`);
  } catch (error: any) {
    logger.error('OAuth callback error', { error: error.message });
    res.redirect(`${config.frontendUrl}/auth/deriv/callback?error=${encodeURIComponent(error.message)}`);
  }
});

export { router as derivAuthRouter };
