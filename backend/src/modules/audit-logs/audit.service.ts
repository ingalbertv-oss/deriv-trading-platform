import prisma from '../../shared/database/prisma';
import { logger } from '../../shared/logger';

export type AuditLevel = 'info' | 'warn' | 'error' | 'debug';

export interface AuditEntry {
  userId?: string;
  domain: string;
  action: string;
  level?: AuditLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class AuditService {
  static async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          domain: entry.domain,
          action: entry.action,
          level: entry.level || 'info',
          message: entry.message,
          contextJson: entry.context ? (entry.context as any) : null,
        },
      });
    } catch (error) {
      logger.error('Failed to write audit log', { error, entry });
    }
  }

  static async getByUser(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getByDomain(domain: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { domain },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
