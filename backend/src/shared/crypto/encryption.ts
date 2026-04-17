import CryptoJS from 'crypto-js';
import { config } from '../config';

const SECRET_KEY = config.encryption.key;

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
