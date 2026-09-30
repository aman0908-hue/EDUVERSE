import AiSettings from '../models/AiSettings.js';
import { encryptSecret, secretHint, trimTrailingSlash } from '../utils/aiCrypto.js';
import { AI_PROVIDERS, callChatCompletion, clearAiConfigCache, getAiConfig, getPublicAiStatus } from '../config/aiConfig.js';

/**
 * AI provider settings for the Admin Console.
 * Lets an admin set / test / clear the API key from the UI instead of editing .env.
 * The real key is never returned by any endpoint — only a masked hint.
 */

// GET /api/v1/admin/ai-settings
export const getAiSettings = async (req, res) => {
    try {
        const settings = await AiSettings.findById('default').lean();
        const status = await getPublicAiStatus();

        res.json({
            success: true,
            providers: Object.entries(AI_PROVIDERS).map(([key, value]) => ({ key, ...value })),
            settings: {
                provider: settings?.provider || 'builtin',
                baseUrl: settings?.baseUrl || '',
                model: settings?.model || '',
                keyHint: settings?.keyHint || '',
                hasKey: Boolean(settings?.apiKeyEncrypted),
                updatedAt: settings?.updatedAt || null
            },
            envFallbackActive: status.source === 'env',
            live: status.live,
            activeProvider: status.provider,
            activeModel: status.model
        });
    } catch (error) {
        res.status(500).json({ message: 'AI settings could not be loaded.' });
    }
};

// PUT /api/v1/admin/ai-settings
export const saveAiSettings = async (req, res) => {
    try {
        const { provider, baseUrl, model, apiKey, clearKey } = req.body || {};
        const preset = AI_PROVIDERS[provider];

        if (!preset) return res.status(400).json({ message: 'Select a valid provider.' });

        const current = await AiSettings.findById('default');

        // Key clear karna ho to key hata do, warna nayi key ya existing key rakho
        let encrypted = current?.apiKeyEncrypted || '';
        let hint = current?.keyHint || '';

        if (clearKey === true) {
            encrypted = '';
            hint = '';
        } else if (apiKey && String(apiKey).trim()) {
            const value = String(apiKey).trim();
            encrypted = encryptSecret(value);
            hint = secretHint(value);
        }

        // Builtin select karne par key delete NAHI hoti — sirf provider switch hota hai,
        // aur purana baseUrl/model bhi save rehta hai taaki wapas switch aasaan ho.
        const finalBaseUrl = provider === 'builtin'
            ? (current?.baseUrl || '')
            : trimTrailingSlash(baseUrl || preset.baseUrl);
        const finalModel = provider === 'builtin'
            ? (current?.model || preset.model)
            : String(model || preset.model || '').trim();

        if (provider !== 'builtin') {
            if (!encrypted && !process.env.AI_API_KEY) {
                return res.status(400).json({ message: 'Enter an API key for this provider, or choose the built-in study guide.' });
            }
            if (!finalBaseUrl) return res.status(400).json({ message: 'Base URL is required for this provider.' });
            if (!finalModel) return res.status(400).json({ message: 'Model name is required for this provider.' });
        }

        await AiSettings.findByIdAndUpdate('default', {
            _id: 'default',
            provider,
            apiKeyEncrypted: encrypted,
            baseUrl: finalBaseUrl,
            model: finalModel,
            keyHint: hint,
            updatedBy: req.user._id
        }, { upsert: true, new: true, setDefaultsOnInsert: true });

        clearAiConfigCache();
        const status = await getPublicAiStatus();

        res.json({
            success: true,
            message: provider === 'builtin'
                ? 'AI switched to the built-in ATs Learning Guide.'
                : 'AI settings saved. The new key is active immediately.',
            settings: { provider, baseUrl: finalBaseUrl, model: finalModel, keyHint: hint, hasKey: Boolean(encrypted) },
            live: status.live,
            activeProvider: status.provider,
            activeModel: status.model
        });
    } catch (error) {
        res.status(500).json({ message: 'AI settings could not be saved.' });
    }
};

// POST /api/v1/admin/ai-settings/test — live connection test
export const testAiSettings = async (req, res) => {
    try {
        const config = await getAiConfig();
        if (!config.apiKey) {
            return res.status(400).json({ success: false, message: 'No API key is configured. Add a key or enable the built-in study guide.' });
        }

        const started = Date.now();
        const result = await callChatCompletion({
            config,
            maxTokens: 30,
            temperature: 0,
            messages: [{ role: 'user', content: 'Reply with the single word: OK' }]
        });
        const elapsed = Date.now() - started;

        res.json({
            success: true,
            message: `Connection successful — replied in ${elapsed} ms using ${result.model}.`,
            model: result.model,
            reply: result.text.slice(0, 40)
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: `Connection failed — ${String(error.message).slice(0, 200)}`
        });
    }
};
