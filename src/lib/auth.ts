import jwt from 'jsonwebtoken';
import { AuthPayload } from './types';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return secret;
}

export function generateToken(uid: string, company_name: string): string {
  const payload: AuthPayload = {
    uid,
    company_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };

  const secret = getJwtSecret();
  console.log('[Auth] Generating token with secret length:', secret.length);
  return jwt.sign(payload, secret);
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const secret = getJwtSecret();
    console.log('[Auth] Verifying token with secret length:', secret.length);
    return jwt.verify(token, secret) as AuthPayload;
  } catch (error) {
    console.log('[Auth] Token verification error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
