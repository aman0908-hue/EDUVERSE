import AiSettings from '../models/AiSettings.js';
import { decryptSecret, trimTrailingSlash } from '../utils/aiCrypto.js';

// Provider presets — sirf 3 options: ATs Learning Guide, Gemini, OpenAI
export const AI_PROVIDERS = {
    builtin: {
        key: 'builtin',
        label: 'ATs Learning Guide',
        description: 'Built-in offline tutor. No API key, no cost, always available.',
        baseUrl: '',
        model: 'ats-learning-guide',
        needsKey: false
    },
    gemini: {
        key: 'gemini',
        label: 'Google Gemini',
        description: 'Free tier available. Best for students. Get a key from aistudio.google.com.',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: 'gemini-flash-latest',
        needsKey: true
    },
    openai: {
        key: 'openai',
        label: 'OpenAI',
        description: 'Paid. Get a key from platform.openai.com. Strongest general model.',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        needsKey: true
    }
};

// Gemini ke liye backup models — ek busy (503) ho to agla try karo.
// Note: gemini-2.0-flash / gemini-2.5-flash ab retire ho chuke hain, isliye latest use kiya hai.
export const GEMINI_FALLBACK_MODELS = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite'
];

// Short cache — har AI request me DB hit na ho, par admin ke save ke baad turant reflect ho
let cache = null;
let cachedAt = 0;
const TTL = 2000;

export const clearAiConfigCache = () => { cache = null; cachedAt = 0; };

const envProvider = baseUrl => {
    if (/generativelanguage|google/i.test(baseUrl)) return 'gemini';
    if (/groq/i.test(baseUrl)) return 'groq';
    if (/openrouter/i.test(baseUrl)) return 'openrouter';
    return 'openai';
};

/**
 * Resolved AI config used by the study assistant.
 * Priority: database settings (set from Admin Console) -> .env variables -> built-in guide.
 */
export const getAiConfig = async () => {
    if (cache && Date.now() - cachedAt < TTL) return cache;

    let settings = null;
    try {
        settings = await AiSettings.findById('default').lean();
    } catch (error) {
        // DB read fail ho to bhi app na tode — env fallback chal jayega
        console.error('AI settings read failed:', error.message);
    }

    const envKey = process.env.AI_API_KEY || '';
    const dbKey = settings ? decryptSecret(settings.apiKeyEncrypted) : '';

    // Agar admin ne "ATs Learning Guide" chuna hai to key ho tab bhi builtin hi chalega
    const useBuiltin = settings?.provider === 'builtin' && !settings?.apiKeyEncrypted === false;
    const builtinForced = settings?.provider === 'builtin' && !envKey && !process.env.AI_FORCE_AI;
    // Builtin tabhi force hoga jab admin ne explicitly builtin select kiya ho
    const forceBuiltin = settings?.provider === 'builtin' && !envKey;

    // DB me key hai to DB win karta hai, warna .env se uthao
    const apiKey = forceBuiltin ? '' : (dbKey || envKey);
    const baseUrl = trimTrailingSlash(
        (dbKey && settings?.baseUrl) || process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    );
    const model = (dbKey && settings?.model) || process.env.AI_MODEL || 'gpt-4o-mini';
    const provider = !apiKey ? 'builtin' : (dbKey ? (settings?.provider || 'openai') : envProvider(baseUrl));
    const source = !apiKey ? 'builtin' : (dbKey ? 'admin-panel' : (envKey ? 'env' : 'none'));

    cache = { apiKey, baseUrl, model, provider, source };
    cachedAt = Date.now();
    return cache;
};

// Public version — API key kabhi response me nahi jata
export const getPublicAiStatus = async () => {
    const config = await getAiConfig();
    return {
        success: true,
        provider: config.provider,
        model: config.provider === 'builtin' ? 'ats-learning-guide' : config.model,
        source: config.source,
        live: Boolean(config.apiKey)
    };
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls an OpenAI-compatible chat endpoint with two safety nets:
 *  1. Retry on transient errors (429 / 500 / 503) — providers get overloaded often
 *  2. Gemini model fallback — if one model is busy or retired, try the next one
 *
 * Returns { text, model } or throws an Error with a readable message.
 */
export const callChatCompletion = async ({ config, messages, maxTokens = 800, temperature = 0.3, retries = 2 }) => {
    const isGemini = /generativelanguage|google/i.test(config.baseUrl);
    // Gemini ko socha hua token chahiye — isliye budget badha kar 3x kar dete hain
    const tokenLimit = isGemini ? maxTokens * 3 : maxTokens;

    const models = isGemini
        ? [...new Set([config.model, ...GEMINI_FALLBACK_MODELS].filter(Boolean))]
        : [config.model];

    let lastError = null;

    for (const model of models) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`${config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({ model, temperature, max_tokens: tokenLimit, messages })
                });

                if (response.ok) {
                    const result = await response.json();
                    const text = result.choices?.[0]?.message?.content?.trim() || '';
                    if (text) return { text, model };

                    // Khali content aaya (thinking ne budget kha diya) — agli model try karo
                    lastError = new Error('The model returned an empty answer.');
                    break;
                }

                const status = response.status;
                const details = await response.text().catch(() => '');

                // Key galat / retire model — retry ka matlab nahi
                if (status === 401 || status === 403) {
                    throw new Error(`The API key was rejected (${status}).`);
                }
                if (status === 404) {
                    lastError = new Error(`Model "${model}" is not available on this provider.`);
                    break; // Agla model try karo
                }
                if (status === 429 || status === 500 || status === 503) {
                    lastError = new Error(`Provider is busy (${status}).`);
                    if (attempt < retries) {
                        await sleep(400 * (attempt + 1));
                        continue;
                    }
                    break; // Is model par retry khatam, agla model
                }

                throw new Error(`Provider returned ${status}${details ? `: ${details.slice(0, 160)}` : ''}`);
            } catch (error) {
                // Auth error turant fail — retry ka matlab nahi
                if (/rejected \(/.test(error.message)) throw error;
                lastError = error;
                if (attempt < retries) {
                    await sleep(400 * (attempt + 1));
                    continue;
                }
            }
        }
    }

    throw lastError || new Error('The AI provider did not respond.');
};
