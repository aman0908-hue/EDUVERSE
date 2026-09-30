// Probe which Gemini model + token settings actually return a full answer.
// Run: node scripts/probe-gemini.mjs
import 'dotenv/config';

const apiKey = process.argv[2] || process.env.AI_API_KEY;
if (!apiKey) { console.error('Pass the key as an argument.'); process.exit(1); }

const URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const ask = { role: 'user', content: 'Explain closures in 2 simple sentences.' };

const probe = async (label, body) => {
    try {
        const res = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        const choice = data.choices?.[0];
        const text = choice?.message?.content || '';
        const status = res.ok ? `OK  len=${text.length}  finish=${choice.finish_reason}` : `ERR ${res.status} ${(data.error?.message || '').slice(0, 80)}`;
        console.log(`  ${label.padEnd(40)} ${status}`);
        if (res.ok) console.log(`     -> ${text.slice(0, 110).replace(/\n/g, ' ')}`);
    } catch (error) {
        console.log(`  ${label.padEnd(40)} FAIL ${error.message}`);
    }
};

const run = async () => {
    await probe('3.5-flash  max_tokens=350', { model: 'gemini-3.5-flash', max_tokens: 350, messages: [ask] });
    await probe('3.5-flash  max_tokens=2000', { model: 'gemini-3.5-flash', max_tokens: 2000, messages: [ask] });
    await probe('3.5-flash  thinking off', {
        model: 'gemini-3.5-flash',
        max_tokens: 350,
        extra_body: { google: { thinking_config: { thinking_budget: 0 } } },
        messages: [ask]
    });
    await probe('flash-latest  max_tokens=350', { model: 'gemini-flash-latest', max_tokens: 350, messages: [ask] });
    await probe('flash-latest  max_tokens=2000', { model: 'gemini-flash-latest', max_tokens: 2000, messages: [ask] });
};

run();
