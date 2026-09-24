import { decodeBase64 } from './encoding';
import type { JWK } from 'jose';

export const JWT_ALGORITHMS = [
  'HS256',
  'HS384',
  'HS512',
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
] as const;

export const JWT_CUSTOM_ALGORITHM = 'custom';

export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];
export type JwtAlgorithmOption = JwtAlgorithm | typeof JWT_CUSTOM_ALGORITHM;
export type JwtPurpose = 'sign' | 'verify';
export type JwtKey = CryptoKey | JWK | Uint8Array;

export type JwtToken = {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonPart(value: string, label: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(decodeBase64(value));

    if (!isRecord(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }

    return parsed;
  } catch {
    throw new Error(`Unable to decode JWT ${label.toLowerCase()}`);
  }
}

export function decodeJwt(token: string): JwtToken {
  const parts = token.trim().split('.');

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error('Not a valid JWT (expected 3 parts)');
  }

  return {
    header: parseJsonPart(parts[0], 'header'),
    payload: parseJsonPart(parts[1], 'payload'),
    signature: parts[2],
  };
}

export function isJwtAlgorithm(value: unknown): value is JwtAlgorithm {
  return typeof value === 'string' && JWT_ALGORITHMS.some((algorithm) => algorithm === value);
}

export function isJwtAlgorithmOption(value: unknown): value is JwtAlgorithmOption {
  return value === JWT_CUSTOM_ALGORITHM || isJwtAlgorithm(value);
}

export function createJwtHeaderText(algorithm: JwtAlgorithm): string {
  return JSON.stringify({ alg: algorithm, typ: 'JWT' }, null, 2);
}

function isJwk(value: unknown): value is JWK {
  return isRecord(value) && typeof value.kty === 'string';
}

function parseJwk(value: string): JWK {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid signing key');
  }

  if (!isJwk(parsed)) {
    throw new Error('Invalid signing key');
  }

  return parsed;
}

function isPemOf(value: string, kind: 'PUBLIC KEY' | 'PRIVATE KEY' | 'CERTIFICATE'): boolean {
  return value.includes(`-----BEGIN ${kind}-----`);
}

export async function importJwtKey(
  value: string,
  algorithm: JwtAlgorithm,
  purpose: JwtPurpose,
): Promise<JwtKey> {
  const key = value.trim();

  if (!key) {
    throw new Error('Signing key is required');
  }

  if (algorithm.startsWith('HS')) {
    return new TextEncoder().encode(key);
  }

  if (key.startsWith('{')) {
    return parseJwk(key);
  }

  const { importPKCS8, importSPKI, importX509 } = await import('jose');

  if (isPemOf(key, 'CERTIFICATE')) {
    if (purpose === 'sign') {
      throw new Error('Invalid signing key');
    }

    return importX509(key, algorithm);
  }

  if (isPemOf(key, 'PRIVATE KEY')) {
    return importPKCS8(key, algorithm);
  }

  if (isPemOf(key, 'PUBLIC KEY')) {
    return importSPKI(key, algorithm);
  }

  throw new Error('Invalid signing key');
}

export async function encodeJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: JwtKey,
  algorithm: JwtAlgorithm,
): Promise<string> {
  const { SignJWT } = await import('jose');
  const signer = new SignJWT(payload).setProtectedHeader({ ...header, alg: algorithm });

  return signer.sign(key);
}

export async function verifyJwtSignature(
  token: string,
  key: JwtKey,
  algorithm: JwtAlgorithm,
): Promise<boolean> {
  const { compactVerify } = await import('jose');

  // compactVerify checks the JWS signature without applying JWT claim-time validation.
  await compactVerify(token.trim(), key, { algorithms: [algorithm] });

  return true;
}
