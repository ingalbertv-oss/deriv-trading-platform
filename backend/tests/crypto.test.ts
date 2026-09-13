import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateSessionToken,
  generateState,
} from '../src/shared/crypto/pkce';

test('generates a valid PKCE verifier and deterministic S256 challenge', () => {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  assert.equal(verifier.length, 43);
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.equal(challenge, generateCodeChallenge(verifier));
});

test('matches the RFC 7636 S256 example', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  assert.equal(
    generateCodeChallenge(verifier),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

test('generates unique state values and session tokens', () => {
  const state = generateState();
  const sessionToken = generateSessionToken();

  assert.match(state, /^[A-Za-z0-9_-]+$/);
  assert.equal(state.length, 32);
  assert.match(sessionToken, /^[a-f0-9]+$/);
  assert.equal(sessionToken.length, 96);
  assert.notEqual(state, generateState());
  assert.notEqual(sessionToken, generateSessionToken());
});
