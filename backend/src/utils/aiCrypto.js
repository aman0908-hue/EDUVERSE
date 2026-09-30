import crypto from 'crypto';

/**
 * Symmetric encryption for the AI API key stored in MongoDB.
 * The encryption key is derived from JWT_SECRET (scrypt), so the key is never
 * stored in plaintext and no extra secret has to be configured.
 */
const ALGO = 'aes-256-gcm';

const deriveKey = () => {
    const secret = process.env.JWT_SECRET || 'eduverse-development-secret';
    return crypto.scryptSync(secret, 'eduverse-ai-settings', 32);
};

export const encryptSecret = plaintext => {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, deriveKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
};

export const decryptSecret = payload => {
    if (!payload) return '';
    try {
        const [iv, tag, data] = String(payload).split('.');
        const decipher = crypto.createDecipheriv(ALGO, deriveKey(), Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
        // Secret change hone par purana ciphertext decrypt nahi hoga
        return '';
    }
};

// UI me dikhane ke liye safe hint, e.g. "sk-abc...9x2"
export const secretHint = plaintext => {
    const value = String(plaintext || '');
    if (!value) return '';
    if (value.length <= 10) return '••••';
    return `${value.slice(0, 5)}...${value.slice(-4)}`;
};

export const trimTrailingSlash = value => String(value || '').trim().replace(/\/+$/, '');
