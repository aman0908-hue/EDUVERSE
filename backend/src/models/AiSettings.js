import mongoose from 'mongoose';

/**
 * Singleton AI provider configuration (one document, id: 'default').
 * Managed from the Admin Console so the API key never has to be edited in .env.
 * The key is stored encrypted — see utils/aiCrypto.js.
 */
const aiSettingsSchema = new mongoose.Schema({
    _id: { type: String, default: 'default' },
    provider: {
        type: String,
        enum: ['builtin', 'openai', 'openrouter', 'groq', 'gemini', 'custom'],
        default: 'builtin'
    },
    // AES-256-GCM ciphertext of the real key. Empty string = not configured.
    apiKeyEncrypted: { type: String, default: '' },
    baseUrl: { type: String, default: 'https://api.openai.com/v1' },
    model: { type: String, default: 'gpt-4o-mini' },
    // Short hint shown in the UI, e.g. "sk-...4d9f" — never the full key.
    keyHint: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export default mongoose.model('AiSettings', aiSettingsSchema);
