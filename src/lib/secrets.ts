import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const prefix = 'enc:v1:';

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      'SESSION_SECRET must be configured before saving integration credentials.',
    );
  return scryptSync(secret, 'churicanvas-social-credentials', 32);
}

export function encryptSecret(value: string) {
  if (!value) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return (
    prefix +
    [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.')
  );
}

export function decryptSecret(value: string) {
  if (!value) return '';
  if (!value.startsWith(prefix)) return value;
  const [iv, tag, encrypted] = value.slice(prefix.length).split('.');
  if (!iv || !tag || !encrypted)
    throw new Error('Stored integration credential is invalid.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
