import { useEffect, useRef, useState, useContext } from 'react';
import { Bot, ImagePlus, LoaderCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import Header from '../components/Header.jsx';
import { UserContext } from '../context/UserContext.jsx';

// 👨‍🏫 Teacher ke liye suggestions — unke apne students ka data
const teacherSuggestions = [
    'How many students do I have in total?',
    'Who attended class today?',
    'Who is absent today?',
    'How many students have taken the quiz?',
    'Who has been inactive for 7 days?',
    'Show my course-wise report and revenue'
];

const myLearningSuggestions = [
    'What is my next lecture?',
    'Which quiz should I take next?',
    'How much have I completed so far?',
    'Which course should I revise?'
];

const suggestions = [
    'What is my next lecture?',
    'Which quiz is pending for me?',
    'What should I watch next?',
    'Explain JavaScript closures in simple words',
    'Create 3 practice MCQs for me'
];

const provider = import.meta.env.VITE_AI_PROVIDER === 'puter' ? 'puter' : 'backend';
const puterModel = import.meta.env.VITE_PUTER_MODEL || 'gpt-6-luna';

const askPuter = async (prompt, imageDataUrl) => {
    if (!window.puter?.ai?.chat) throw new Error('Puter SDK is not available.');
    const options = { model: puterModel };
    const result = imageDataUrl
        ? await window.puter.ai.chat(prompt, imageDataUrl, options)
        : await window.puter.ai.chat(prompt, options);
    return result?.message?.content || result?.text || result || 'No answer generated.';
};

const AIAssistant = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [status, setStatus] = useState(null);
    // 👨‍🏫 Teacher ko apne students ke analytics wale suggestions dikhenge
    const { user } = useContext(UserContext);
    const activeSuggestions = user?.role === 'teacher' ? teacherSuggestions : suggestions;
    const endRef = useRef(null);

    // Status hamesha fresh laao — admin ne abhi key set ki ho to turant reflect ho.
    // no-store browser/proxy cache bhi bypass karta hai.
    const loadStatus = () => api.get('/ai/status', { params: { t: Date.now() } })
        .then(r => setStatus(r.data))
        .catch(() => setStatus({ provider: 'unknown' }));

    useEffect(() => {
        loadStatus();
        // Page visible hone par dobara check karo (tab switch ke baad bhi fresh mile)
        const onVisible = () => { if (document.visibilityState === 'visible') loadStatus(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB.');
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(file);
    };

    const send = async (text) => {
        const value = String(text || input).trim();
        if (!value || loading) return;
        setMessages(m => [...m, { from: 'user', text: value, image }]);
        setInput('');
        setImage(null);
        setLoading(true);
        try {
            let answer;
            if (provider === 'puter') {
                answer = await askPuter(value, image);
            } else {
                const res = await api.post('/ai/ask', { question: value });
                answer = res.data.answer;
            }
            setMessages(m => [...m, { from: 'ai', text: answer }]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI is unavailable right now.');
            setMessages(m => [...m, { from: 'ai', text: 'Sorry, I could not answer that. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-page">
            <Header />
            <main className="ai-shell">
                <header className="ai-header">
                    <div className="ai-header-icon"><Bot size={26} /></div>
                    <div>
                        <h1><Sparkles size={20} /> ATs Learning AI Assistant</h1>
                        <p>Ask anything about your studies, notes, or concepts.</p>
                    </div>
                    {status && status.provider !== 'unknown' && (
                        <span className={`ai-status ${status.live ? 'live' : 'builtin'}`}>
                            {status.live ? `Live AI · ${status.model}` : 'Study Guide Mode'}
                        </span>
                    )}
                </header>

                {status && !status.live && (
                    <div className="ai-notice">
                        <Sparkles size={16} />
                        <span>
                            No AI key is configured, so the <strong>ATs Learning Guide</strong> is answering right now.
                            An admin can switch to a real AI model from <strong>Admin Console → AI Settings</strong> — no code change needed.
                        </span>
                    </div>
                )}

                <p className="ai-safety-note">
                    <ShieldCheck size={14} />
                    Answers are based on your course material only. The assistant never shares anyone&rsquo;s personal data and refuses illegal or exam-cheating requests.
                </p>

                <div className="ai-chat">
                    {messages.length === 0 && (
                        <div className="ai-empty">
                            <span>👋</span>
                            <h2>What would you like to learn today?</h2>
                            <p>Ask a question or pick a suggestion below.</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`ai-msg ${m.from}`}>
                            {m.from === 'ai' && <div className="ai-msg-avatar"><Bot size={16} /></div>}
                            <div className="ai-bubble">
                                {m.image && <img src={m.image} alt="uploaded" />}
                                <p>{m.text}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="ai-msg ai">
                            <div className="ai-msg-avatar"><Bot size={16} /></div>
                            <div className="ai-bubble typing"><LoaderCircle className="spin" size={16} /> Thinking...</div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {messages.length === 0 && (
                    <div className="ai-suggestions">
                        {activeSuggestions.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}
                    </div>
                )}

                {image && (
                    <div className="ai-preview">
                        <img src={image} alt="preview" />
                        <button onClick={() => setImage(null)}><X size={15} /></button>
                    </div>
                )}

                <form className="ai-input-bar" onSubmit={e => { e.preventDefault(); send(); }}>
                    {provider === 'puter' && (
                        <label className="ai-attach" title="Attach image">
                            <ImagePlus size={19} />
                            <input type="file" accept="image/*" onChange={handleImage} />
                        </label>
                    )}
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask anything about your studies..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !input.trim()}><Send size={18} /></button>
                </form>
            </main>
        </div>
    );
};

export default AIAssistant;
