import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';
import { DerivWsService } from './deriv-ws.service';
import { DerivAccountsService } from '../deriv-accounts/deriv-accounts.service';
import { BadRequestError } from '../../shared/errors';

export function createDerivWsRoutes(wsService: DerivWsService) {
  const router = Router();

  /**
   * POST /api/deriv/accounts/:accountId/ws/connect
   */
  router.post('/:accountId/ws/connect', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.accountId as string;
      const account = await DerivAccountsService.getAccountByDerivId(req.userId!, accountId);
      if (!account) {
        throw new BadRequestError('Account not found');
      }

      await wsService.connect(req.userId!, accountId);

      // Auto-subscribe to balance
      wsService.subscribeBalance(req.userId!, accountId);

      res.json({
        success: true,
        data: {
          status: wsService.getSessionStatus(req.userId!, accountId),
          accountId: accountId,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/accounts/:accountId/ws/disconnect
   */
  router.post('/:accountId/ws/disconnect', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await wsService.disconnect(req.userId!, req.params.accountId as string);
      res.json({ success: true, data: { status: 'disconnected' } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
