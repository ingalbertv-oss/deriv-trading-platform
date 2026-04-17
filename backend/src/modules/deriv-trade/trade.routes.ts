import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';
import { DerivWsService } from '../deriv-ws/deriv-ws.service';
import { DerivAccountsService } from '../deriv-accounts/deriv-accounts.service';
import { BadRequestError } from '../../shared/errors';
import { z } from 'zod';
import { validateBody } from '../../shared/middleware/validate';

export function createTradeRoutes(wsService: DerivWsService) {
  const router = Router();

  /**
   * POST /api/deriv/trade/proposal
   */
  const proposalSchema = z.object({
    contract_type: z.string(),
    currency: z.string().default('USD'),
    symbol: z.string(),
    stake: z.number().positive(),
    duration: z.number().positive(),
    duration_unit: z.enum(['t', 's', 'm', 'h', 'd']),
    basis: z.enum(['stake', 'payout']).default('stake'),
  });

  router.post('/proposal', authMiddleware, validateBody(proposalSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      const data = req.body;
      const options = {
        contract_type: data.contract_type,
        currency: data.currency,
        underlying_symbol: data.symbol,
        amount: data.stake,
        basis: data.basis,
        duration: data.duration,
        duration_unit: data.duration_unit,
        subscribe: 1, // Auto-subscribe to updates
      };

      wsService.getProposal(req.userId!, account.derivAccountId, options);
      res.json({ success: true, data: { message: 'Proposal request sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/trade/buy
   */
  const buySchema = z.object({
    buyId: z.string().min(1),
    price: z.number().positive(),
  });

  router.post('/buy', authMiddleware, validateBody(buySchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      const { buyId, price } = req.body;
      wsService.buyContract(req.userId!, account.derivAccountId, buyId, price);
      res.json({ success: true, data: { message: 'Buy command sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/trade/sell
   */
  const sellSchema = z.object({
    contractId: z.number(),
    price: z.number().default(0),
  });

  router.post('/sell', authMiddleware, validateBody(sellSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      const { contractId, price } = req.body;
      wsService.sellContract(req.userId!, account.derivAccountId, contractId, price);
      res.json({ success: true, data: { message: 'Sell command sent' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/deriv/trade/subscribe-position
   */
  const subscribePositionSchema = z.object({
    contractId: z.number().optional(),
  });

  router.post('/subscribe-position', authMiddleware, validateBody(subscribePositionSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const account = await DerivAccountsService.getActiveAccount(req.userId!);
      if (!account) throw new BadRequestError('No active account');

      wsService.subscribeOpenContract(req.userId!, account.derivAccountId, req.body.contractId);
      res.json({ success: true, data: { message: 'Open contract subscription active' } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
