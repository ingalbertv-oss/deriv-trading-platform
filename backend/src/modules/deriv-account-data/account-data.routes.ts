import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';
import { DerivWsService } from '../deriv-ws/deriv-ws.service';
import { DerivAccountsService } from '../deriv-accounts/deriv-accounts.service';
import { BadRequestError } from '../../shared/errors';

export function createAccountDataRoutes(wsService: DerivWsService) {
  const router = Router();

  /**
   * GET /api/deriv/account/balance
   */
  router.get('/balance', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.subscribeBalance(req.userId!, account.derivAccountId);
      res.json({ success: true, data: { message: 'Balance subscription active' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/account/portfolio
   */
  router.get('/portfolio', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.subscribePortfolio(req.userId!, account.derivAccountId);
      res.json({ success: true, data: { message: 'Portfolio request sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/account/statement
   */
  router.get('/statement', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      wsService.getStatement(req.userId!, account.derivAccountId, { limit, offset });
      res.json({ success: true, data: { message: 'Statement request sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/account/transactions
   */
  router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.subscribeTransaction(req.userId!, account.derivAccountId);
      res.json({ success: true, data: { message: 'Transaction subscription active' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/account/profit-table
   */
  router.get('/profit-table', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      wsService.getProfitTable(req.userId!, account.derivAccountId, { limit, offset });
      res.json({ success: true, data: { message: 'Profit table request sent' } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
