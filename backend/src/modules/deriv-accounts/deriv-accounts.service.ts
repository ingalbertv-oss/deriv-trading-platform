import prisma from '../../shared/database/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { AuditService } from '../audit-logs/audit.service';

export class DerivAccountsService {
  /**
   * Get all Deriv accounts for a user
   */
  static async getAccounts(userId: string) {
    return prisma.derivAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Select an account as active/default
   */
  static async selectAccount(userId: string, accountId: string) {
    const account = await prisma.derivAccount.findFirst({
      where: { userId, derivAccountId: accountId },
    });

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Unset all defaults for user
    await prisma.derivAccount.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this one as default
    await prisma.derivAccount.update({
      where: { id: account.id },
      data: { isDefault: true },
    });

    await AuditService.log({
      userId,
      domain: 'deriv-accounts',
      action: 'select_account',
      message: `Selected account ${accountId} as active`,
    });

    return account;
  }

  /**
   * Get the currently active account
   */
  static async getActiveAccount(userId: string) {
    const account = await prisma.derivAccount.findFirst({
      where: { userId, isDefault: true, isActive: true },
    });

    return account;
  }

  /**
   * Get account by deriv account ID
   */
  static async getAccountByDerivId(userId: string, derivAccountId: string) {
    return prisma.derivAccount.findFirst({
      where: { userId, derivAccountId },
    });
  }
}
