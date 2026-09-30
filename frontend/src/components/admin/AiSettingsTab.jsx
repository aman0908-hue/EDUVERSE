import { useEffect, useState } from 'react';
import { Eye, EyeOff, GraduationCap, KeyRound, Plug, Save, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDateTime, EmptyState } from './shared.jsx';

// AI Settings tab — admin se API key set / test / clear, bina .env edit kiye
const AiSettingsTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [form, setForm] = useState({ provider: 'builtin', baseUrl: '', model: '', apiKey: '' });

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/ai-settings');
            setData(res.data);
            setForm({
                provider: res.data.settings.provider || 'builtin',
                baseUrl: res.data.settings.baseUrl || '',
                model: res.data.settings.model || '',
                apiKey: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI settings could not be loaded.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // Provider change karte hi base URL + model preset bhar do
    const pickProvider = key => {
        const preset = (data?.providers || []).find(p => p.key === key);
        setForm(prev => ({
            ...prev,
            provider: key,
            baseUrl: key === 'builtin' ? '' : (preset?.baseUrl || ''),
            model: key === 'builtin' ? '' : (preset?.model || '')
        }));
    };

    const save = async event => {
        event.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/admin/ai-settings', {
                provider: form.provider,
                baseUrl: form.baseUrl,
                model: form.model,
                apiKey: form.apiKey.trim() || undefined
            });
            toast.success(res.data.message);
            setForm(prev => ({ ...prev, apiKey: '' }));
            setShowKey(false);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI settings could not be saved.');
        } finally { setSaving(false); }
    };

    const test = async () => {
        setTesting(true);
        try {
            const res = await api.post('/admin/ai-settings/test');
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Connection test failed.');
        } finally { setTesting(false); }
    };

    // Ek click me wapas built-in ATs Learning Guide par wapas
    const switchToEduverse = async () => {
        setSaving(true);
        try {
            const res = await api.put('/admin/ai-settings', { provider: 'builtin' });
            toast.success('Switched back to the ATs Learning Guide.');
            setForm({ provider: 'builtin', baseUrl: '', model: '', apiKey: '' });
            setShowKey(false);
            await load();
            if (res.data.message) console.log(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not switch to the ATs Learning Guide.');
        } finally { setSaving(false); }
    };

    const clearKey = async () => {
        setSaving(true);
        try {
            const res = await api.put('/admin/ai-settings', { provider: 'builtin', clearKey: true });
            toast.success(res.data.message);
            setForm({ provider: 'builtin', baseUrl: '', model: '', apiKey: '' });
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'API key could not be removed.');
        } finally { setSaving(false); }
    };

    if (loading && !data) return <EmptyState text="Loading AI settings..." />;
    if (!data) return <EmptyState text="AI settings could not be loaded." />;

    const live = Boolean(data.live);
    const isBuiltin = form.provider === 'builtin';
    const currentProvider = (data.providers || []).find(p => p.key === form.provider);

    return (
        <>
            <section className={`admin-ai-banner ${live ? 'live' : 'off'}`}>
                <span className="admin-ai-banner-icon">{live ? <Sparkles size={20} /> : <KeyRound size={20} />}</span>
                <div>
                    <strong>{live ? `AI is LIVE — ${data.activeProvider} (${data.activeModel})` : 'ATs Learning Guide is running'}</strong>
                    <span>
                        {live
                            ? 'Real AI model connected. Students are getting model answers.'
                            : 'No API key configured, so the built-in offline study guide is answering. Add a key below to switch to a real model.'}
                    </span>
                </div>
                <button className="btn btn-outline" onClick={test} disabled={testing || !live}>
                    <Plug size={15} /> {testing ? 'Testing...' : 'Test Connection'}
                </button>
            </section>

            {data.envFallbackActive && (
                <p className="admin-note">
                    <TriangleAlert size={14} /> A key was found in the backend .env file. Saving here will override it for this platform.
                </p>
            )}

            <form onSubmit={save} className="dashboard-card admin-card">
                <div className="admin-card-heading">
                    <div>
                        <h2 className="card-title">AI Provider Configuration</h2>
                        <p className="card-text">Choose a provider, paste the API key and save. The key is stored encrypted and never shown again in full.</p>
                    </div>
                    <KeyRound size={22} color="#4f46e5" />
                </div>

                <div className="admin-form">
                    <span className="admin-field-label">Choose your AI</span>
                    <div className="admin-provider-grid">
                        {(data.providers || []).map(p => (
                            <button
                                type="button"
                                key={p.key}
                                className={`admin-provider-card ${form.provider === p.key ? 'active' : ''}`}
                                onClick={() => pickProvider(p.key)}
                                disabled={saving}
                            >
                                <span className="admin-provider-top">
                                    <strong>{p.label}</strong>
                                    {p.needsKey ? <em>API key</em> : <em className="free">Free · no key</em>}
                                </span>
                                <small>{p.description}</small>
                            </button>
                        ))}
                    </div>

                    {!isBuiltin && (
                        <>
                            <label className="admin-field">
                                <span>API Key {data.settings.hasKey && <em>Current: {data.settings.keyHint}</em>}</span>
                                <div className="admin-key-input">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={form.apiKey}
                                        onChange={e => setForm({ ...form, apiKey: e.target.value })}
                                        placeholder={data.settings.hasKey ? 'Leave blank to keep the current key' : 'Paste your API key'}
                                        autoComplete="off"
                                    />
                                    <button type="button" onClick={() => setShowKey(v => !v)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </label>

                            <label className="admin-field">
                                <span>Base URL</span>
                                <input value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
                            </label>

                            <label className="admin-field">
                                <span>Model</span>
                                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" />
                            </label>
                        </>
                    )}

                    {isBuiltin && (
                        <p className="admin-note">
                            The built-in study guide runs fully offline, needs no key, and is always available as a fallback.
                        </p>
                    )}

                    <div className="admin-field-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        {live && (
                            <button type="button" className="btn btn-outline" onClick={switchToEduverse} disabled={saving}>
                                <GraduationCap size={15} /> Switch to ATs Learning Guide
                            </button>
                        )}
                        {data.settings.hasKey && !live && (
                            <button type="button" className="table-action deactivate" onClick={clearKey} disabled={saving}>
                                <Trash2 size={15} /> Remove API Key
                            </button>
                        )}
                    </div>

                    {data.settings.updatedAt && (
                        <small className="admin-meta">Last updated: {formatDateTime(data.settings.updatedAt)}</small>
                    )}
                </div>

                {currentProvider?.needsKey && !isBuiltin && (
                    <p className="admin-note admin-tip">
                        <Sparkles size={14} />
                        {form.provider === 'gemini'
                            ? 'Get a free Gemini key: open AI Studio → Dashboard → Get API key, then paste it above and press Save.'
                            : 'Get an OpenAI key: platform.openai.com → API keys, then paste it above and press Save.'}
                    </p>
                )}
            </form>
        </>
    );
};

export default AiSettingsTab;

