import crypto from 'crypto';

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
