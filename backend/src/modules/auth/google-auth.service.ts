import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import prisma from '../../shared/database/prisma';
import { config } from '../../shared/config';
import { AuditService } from '../audit-logs/audit.service';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../shared/errors';

export interface GoogleIdentityPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
}

export class GoogleAuthService {
  private static client = new OAuth2Client();

  static challenge(): { nonce: string; signature: string } {
    this.ensureEnabled();
    const nonce = crypto.randomBytes(32).toString('base64url');
    return { nonce, signature: this.signNonce(nonce) };
  }

  static async login(credential: string, nonce: string, signature: string) {
    this.ensureEnabled();
    if (!credential || !nonce || !this.validNonce(nonce, signature)) {
      throw new UnauthorizedError('Invalid Google authentication challenge');
    }
    let payload: GoogleIdentityPayload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: config.google.clientId });
      payload = ticket.getPayload() as GoogleIdentityPayload;
    } catch {
      throw new UnauthorizedError('Invalid Google credential');
    }
    if (!payload || payload.nonce !== nonce || payload.email_verified !== true || !payload.sub || !payload.email || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss || '') || payload.aud !== config.google.clientId || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedError('Invalid Google credential');
    }
    const email = payload.email.trim().toLowerCase();
    const identity = await prisma.externalIdentity.findUnique({ where: { provider_providerId: { provider: 'google', providerId: payload.sub } }, include: { user: true } });
    if (identity) return { user: identity.user, created: false };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('This email is already registered. Sign in with your password first.');
    const passwordHash = this.randomPasswordHash();
    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { name: (payload.name || email).slice(0, 100), email, passwordHash } });
        await tx.externalIdentity.create({ data: { userId: created.id, provider: 'google', providerId: payload.sub, providerEmail: email, avatarUrl: payload.picture?.startsWith('https://') ? payload.picture : null } });
        return created;
      });
      await AuditService.log({ userId: user.id, domain: 'auth', action: 'google_register', message: 'User registered with Google' });
      return { user, created: true };
    } catch {
      throw new ConflictError('Unable to create Google account');
    }
  }

  private static ensureEnabled(): void {
    if (!config.google.enabled || !config.google.clientId) throw new BadRequestError('Google authentication is not configured');
  }

  private static signNonce(nonce: string): string {
    return crypto.createHmac('sha256', config.session.secret).update(nonce).digest('base64url');
  }

  private static validNonce(nonce: string, signature: string): boolean {
    const expected = this.signNonce(nonce);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private static randomPasswordHash(password = crypto.randomBytes(64).toString('hex')): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }
}
