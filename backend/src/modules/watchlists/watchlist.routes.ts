import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware';
import prisma from '../../shared/database/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/watchlists
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId: req.userId! },
      include: { symbols: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: watchlists });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/watchlists
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      isDefault: z.boolean().optional(),
    });

    const { name, isDefault } = schema.parse(req.body);

    if (isDefault) {
      await prisma.watchlist.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false },
      });
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId: req.userId!,
        name,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/watchlists/:id
 */
router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      isDefault: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const existing = await prisma.watchlist.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });

    if (!existing) throw new NotFoundError('Watchlist not found');

    if (data.isDefault) {
      await prisma.watchlist.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false },
      });
    }

    const watchlist = await prisma.watchlist.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/watchlists/:id
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.watchlist.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });

    if (!existing) throw new NotFoundError('Watchlist not found');

    await prisma.watchlist.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/watchlists/:id/symbols
 */
router.post('/:id/symbols', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      symbol: z.string().min(1),
      sortOrder: z.number().optional(),
    });

    const { symbol, sortOrder } = schema.parse(req.body);

    const watchlist = await prisma.watchlist.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });

    if (!watchlist) throw new NotFoundError('Watchlist not found');

    const entry = await prisma.watchlistSymbol.create({
      data: {
        watchlistId: req.params.id as string,
        symbol,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/watchlists/:id/symbols/:symbol
 */
router.delete('/:id/symbols/:symbol', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await prisma.watchlistSymbol.findFirst({
      where: {
        watchlistId: req.params.id as string,
        symbol: req.params.symbol as string,
        watchlist: { userId: req.userId! },
      },
    });

    if (!entry) throw new NotFoundError('Symbol not found in watchlist');

    await prisma.watchlistSymbol.delete({ where: { id: entry.id } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export { router as watchlistRouter };
