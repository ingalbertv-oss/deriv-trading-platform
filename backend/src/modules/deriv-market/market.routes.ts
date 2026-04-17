import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';
import { DerivWsService } from '../deriv-ws/deriv-ws.service';
import { DerivAccountsService } from '../deriv-accounts/deriv-accounts.service';
import { BadRequestError } from '../../shared/errors';
import { z } from 'zod';

export function createMarketRoutes(wsService: DerivWsService) {
  const router = Router();

  /**
   * GET /api/deriv/market/active-symbols
   */
  router.get('/active-symbols', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.getActiveSymbols(req.userId!, account.derivAccountId);
      res.json({ success: true, data: { message: 'Symbols request sent, listen to WS for data' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/market/trading-times
   */
  router.get('/trading-times', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.getTradingTimes(req.userId!, account.derivAccountId);
      res.json({ success: true, data: { message: 'Trading times request sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/deriv/market/ticks-history
   */
  router.get('/ticks-history', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        symbol: z.string(),
        style: z.enum(['ticks', 'candles']).optional(),
        granularity: z.coerce.number().optional(),
        start: z.coerce.number().optional(),
        end: z.coerce.number().optional(),
        count: z.coerce.number().optional(),
      });

      const params = schema.parse(req.query);
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.getTicksHistory(req.userId!, account.derivAccountId, params.symbol, {
        style: params.style,
        granularity: params.granularity,
        start: params.start,
        end: params.end,
        count: params.count,
      });

      res.json({ success: true, data: { message: 'Ticks history request sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/market/subscribe
   */
  router.post('/subscribe', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.body;
      if (!symbol) throw new BadRequestError('Symbol is required');

      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.subscribeTicks(req.userId!, account.derivAccountId, symbol);
      res.json({ success: true, data: { message: `Subscribed to ${symbol}` } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/market/unsubscribe
   */
  router.post('/unsubscribe', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { streamType } = req.body;
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.forgetAll(req.userId!, account.derivAccountId, streamType || 'ticks');
      res.json({ success: true, data: { message: 'Unsubscribed' } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
