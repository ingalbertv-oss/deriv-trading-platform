import { Router, Response, NextFunction } from 'express';
import { DerivAccountsService } from './deriv-accounts.service';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';

const router = Router();

/**
 * GET /api/deriv/accounts
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await DerivAccountsService.getAccounts(req.userId!);
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/deriv/accounts/:accountId/select
 */
router.post('/:accountId/select', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await DerivAccountsService.selectAccount(req.userId!, req.params.accountId as string);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deriv/accounts/active
 */
router.get('/active', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await DerivAccountsService.getActiveAccount(req.userId!);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

export { router as derivAccountsRouter };
