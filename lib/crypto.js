import crypto from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16, SALT_LENGTH = 64, TAG_LENGTH = 16, KEY_LENGTH = 32, ITERATIONS = 100000;
const pbkdf2 = promisify(crypto.pbkdf2);

async function deriveKey(password, salt) {
  return pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

export async function encrypt(text) {
  if (!text) return '';
  const key = process.env.ENCRYPTION_KEY;
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const derived = await deriveKey(key, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, derived, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

export async function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const key = process.env.ENCRYPTION_KEY;
  const combined = Buffer.from(encryptedText, 'base64');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const derived = await deriveKey(key, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, derived, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}
