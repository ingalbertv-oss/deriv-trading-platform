import axios from 'axios';
import { config } from '../../shared/config';
import { encrypt, decrypt, generateCodeVerifier, generateCodeChallenge, generateState, generateSessionToken } from '../../shared/crypto';
import prisma from '../../shared/database/prisma';
import { logger } from '../../shared/logger';
import { AuditService } from '../audit-logs/audit.service';
import { DerivApiError, BadRequestError } from '../../shared/errors';
import { DerivOAuthTokenResponse, DerivAccountRaw } from '../deriv-shared/deriv.types';
import { DerivAdapter } from '../deriv-shared/deriv.adapter';
import crypto from 'crypto';

// In-memory store for PKCE state (per-user session)
// In production, use Redis or similar
const pendingOAuthFlows = new Map<string, {
  codeVerifier: string;
  state: string;
  userId: string;
  createdAt: number;
}>();

// Clean up expired flows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, flow] of pendingOAuthFlows.entries()) {
    if (now - flow.createdAt > 10 * 60 * 1000) { // 10 min expiry
      pendingOAuthFlows.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class DerivAuthService {
  /**
   * Start OAuth flow: generate PKCE pair, state, and return authorization URL
   */
  static startOAuth(userId: string): { authorizationUrl: string; state: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE flow keyed by state
    pendingOAuthFlows.set(state, {
      codeVerifier,
      state,
      userId,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      app_id: config.deriv.appId,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      redirect_uri: config.deriv.oauthRedirectUri,
    });

    const authorizationUrl = `${config.deriv.authBaseUrl}/oauth2/authorize?${params.toString()}`;

    logger.info('OAuth flow started', { userId, state: state.substring(0, 8) + '...' });

    return { authorizationUrl, state };
  }

  /**
   * Handle OAuth callback: validate state, exchange code for token, persist connection
   */
  static async handleCallback(code: string, state: string): Promise<{ userId: string; connectionId: string }> {
    // Validate state
    const flow = pendingOAuthFlows.get(state);
    if (!flow) {
      throw new BadRequestError('Invalid or expired OAuth state');
    }

    // Remove used state
    pendingOAuthFlows.delete(state);

    // Check expiry (10 min)
    if (Date.now() - flow.createdAt > 10 * 60 * 1000) {
      throw new BadRequestError('OAuth flow expired');
    }

    try {
      // Exchange code for token
      const tokenResponse = await axios.post<DerivOAuthTokenResponse>(
        `${config.deriv.authBaseUrl}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.deriv.oauthRedirectUri,
          code_verifier: flow.codeVerifier,
          client_id: config.deriv.clientId,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

      // Encrypt tokens before storing
      const accessTokenEncrypted = encrypt(access_token);
      const refreshTokenEncrypted = refresh_token ? encrypt(refresh_token) : null;

      const tokenExpiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : null;

      // Create or update deriv connection
      const connection = await prisma.derivConnection.create({
        data: {
          userId: flow.userId,
          provider: 'deriv',
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          scope: scope || null,
          isActive: true,
        },
      });

      await AuditService.log({
        userId: flow.userId,
        domain: 'deriv-auth',
        action: 'oauth_callback_success',
        message: 'Successfully connected Deriv account via OAuth',
      });

      // Fetch and store accounts
      await DerivAuthService.fetchAndStoreAccounts(flow.userId, connection.id, access_token);

      return { userId: flow.userId, connectionId: connection.id };
    } catch (error: any) {
      logger.error('OAuth token exchange failed', { error: error.message });
      await AuditService.log({
        userId: flow.userId,
        domain: 'deriv-auth',
        action: 'oauth_callback_failed',
        level: 'error',
        message: `OAuth token exchange failed: ${error.message}`,
      });
      throw new DerivApiError('Failed to exchange authorization code for token');
    }
  }

  /**
   * Fetch accounts from Deriv API and store them
   */
  static async fetchAndStoreAccounts(userId: string, connectionId: string, accessToken: string): Promise<void> {
    try {
      const response = await axios.get(`${config.deriv.apiBaseUrl}/trading/v1/options/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Deriv-App-ID': config.deriv.appId,
        },
      });

      const rawAccounts: DerivAccountRaw[] = response.data.accounts || response.data;
      const accounts = DerivAdapter.toInternalAccounts(
        Array.isArray(rawAccounts) ? rawAccounts : []
      );

      for (const account of accounts) {
        await prisma.derivAccount.upsert({
          where: {
            userId_derivAccountId: {
              userId,
              derivAccountId: account.accountId,
            },
          },
          create: {
            userId,
            derivConnectionId: connectionId,
            derivAccountId: account.accountId,
            accountType: account.accountType,
            currency: account.currency,
            groupName: account.group,
            isDefault: false,
            isActive: !account.isDisabled,
          },
          update: {
            derivConnectionId: connectionId,
            accountType: account.accountType,
            currency: account.currency,
            groupName: account.group,
            isActive: !account.isDisabled,
          },
        });
      }

      // Set first account as default if none is default
      const hasDefault = await prisma.derivAccount.findFirst({
        where: { userId, isDefault: true },
      });

      if (!hasDefault) {
        const firstAccount = await prisma.derivAccount.findFirst({
          where: { userId, isActive: true },
        });
        if (firstAccount) {
          await prisma.derivAccount.update({
            where: { id: firstAccount.id },
            data: { isDefault: true },
          });
        }
      }

      logger.info(`Stored ${accounts.length} Deriv accounts for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to fetch Deriv accounts', { error: error.message });
    }
  }

  /**
   * Get decrypted access token for a user's active connection
   */
  static async getAccessToken(userId: string): Promise<string | null> {
    const connection = await prisma.derivConnection.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) return null;

    return decrypt(connection.accessTokenEncrypted);
  }

  /**
   * Disconnect a Deriv connection
   */
  static async disconnect(userId: string, connectionId: string): Promise<void> {
    await prisma.derivConnection.update({
      where: { id: connectionId, userId },
      data: { isActive: false },
    });

    await AuditService.log({
      userId,
      domain: 'deriv-auth',
      action: 'disconnect',
      message: 'Deriv connection disconnected',
    });
  }

  /**
   * Get connection status for user
   */
  static async getStatus(userId: string) {
    const connection = await prisma.derivConnection.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      connected: !!connection,
      connectionId: connection?.id || null,
      tokenExpiresAt: connection?.tokenExpiresAt || null,
    };
  }

  /**
   * Get all connections for a user
   */
  static async getConnections(userId: string) {
    return prisma.derivConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        tokenExpiresAt: true,
        scope: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
