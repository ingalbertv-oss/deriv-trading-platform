import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { BadRequestError } from '../errors';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const message = (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new BadRequestError(`Validation error: ${message}`));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const message = (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new BadRequestError(`Validation error: ${message}`));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const message = (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new BadRequestError(`Validation error: ${message}`));
      } else {
        next(error);
      }
    }
  };
}
