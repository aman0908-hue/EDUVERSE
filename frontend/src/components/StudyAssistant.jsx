import { useEffect, useState } from 'react';
import { Bot, ImagePlus, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

const quickPrompts = [
    'Give me a simple summary',
    'Explain this like I am a beginner',
    'Create a 3-question self quiz',
    'What should I revise next?'
];

const provider = import.meta.env.VITE_AI_PROVIDER === 'puter' ? 'puter' : 'backend';
const puterModel = import.meta.env.VITE_PUTER_MODEL || 'gpt-6-luna';

const getContext = ({ course, lesson }) => {
    const notes = String(lesson?.theoryContent || '').slice(0, 2500);
    return `You are the ATs Learning Study Assistant. Be encouraging, accurate and practical. Explain concepts simply, use one example, and end with one short self-check question.\n\nCourse: ${course?.title || 'Enrolled course'}\nLesson: ${lesson?.title || 'Current lesson'}\nLesson notes: ${notes || 'No notes were provided for this lesson.'}`;
};

const askPuter = async (prompt, imageDataUrl) => {
    if (!window.puter?.ai?.chat) throw new Error('Puter SDK is not available.');
    const options = { model: puterModel };
    const result = imageDataUrl
        ? await window.puter.ai.chat(prompt, imageDataUrl, options)
        : await window.puter.ai.chat(prompt, options);
    return result?.message?.content || result?.text || result || 'I could not generate an answer. Please try again.';
};

const askBackend = async (prompt, courseId, lessonId) => {
    const response = await api.post('/ai/study-assistant', {
        question: prompt,
        courseId,
        lessonId
    });
    // Server batata hai ki real model se aaya ya built-in study guide se
    return { answer: response.data.answer, live: response.data.mode === 'ai' };
};

const assertCourseAccess = async (courseId, lessonId) => {
    if (!courseId) return;
    await api.get(`/ai/study-assistant/access/${courseId}`, {
        params: lessonId ? { lessonId } : {}
    });
};

const StudyAssistant = ({ course, lesson, courseId }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [usedProvider, setUsedProvider] = useState(provider);
    const [answerIsLive, setAnswerIsLive] = useState(null);

    // Page load par hi pata chala jaye AI live hai ya study guide — poocha nahi hai abhi
    useEffect(() => {
        let alive = true;
        api.get('/ai/status', { params: { t: Date.now() } })
            .then(r => alive && setAnswerIsLive(Boolean(r.data.live)))
            .catch(() => alive && setAnswerIsLive(null));
        return () => { alive = false; };
    }, []);

    const handleImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.onerror = () => toast.error('Image could not be read.');
        reader.readAsDataURL(file);
    };

    const ask = async (prompt) => {
        const value = String(prompt || question).trim();
        if (!value || loading) return;
        setQuestion(value);
        setLoading(true);
        setUsedProvider(provider);
        try {
            const fullPrompt = `${getContext({ course, lesson })}\n\nStudent question: ${value}`;
            let text;
            let live = true;

            if (provider === 'puter') {
                try {
                    // Enrollment must be verified server-side before any browser-side AI call.
                    await assertCourseAccess(courseId, lesson?._id);
                    text = await askPuter(fullPrompt, image);
                    live = true;
                } catch (puterError) {
                    console.warn('Puter failed, falling back to protected backend:', puterError);
                    const result = await askBackend(value, courseId, lesson?._id);
                    text = result.answer;
                    live = result.live;
                    setUsedProvider('backend');
                }
            } else {
                const result = await askBackend(value, courseId, lesson?._id);
                text = result.answer;
                live = result.live;
            }

            setAnswer(text);
            setAnswerIsLive(live);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Study assistant is unavailable right now.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <section className="study-assistant" aria-labelledby="study-assistant-title">
            <div className="study-assistant-heading">
                <div className="study-assistant-icon"><Bot size={20} /></div>
                <div>
                    <h2 id="study-assistant-title"><Sparkles size={17} /> ATs Learning Study Assistant</h2>
                    <p>Ask for explanations, revision help, and practice questions for this lesson.</p>
                </div>
                <span className="study-provider">
                    {answerIsLive === null
                        ? (usedProvider === 'puter' ? 'Puter AI' : 'ATs Learning AI')
                        : answerIsLive
                            ? `Live AI · ${usedProvider === 'puter' ? 'Puter' : 'Model'}`
                            : 'Study Guide Mode'}
                </span>
            </div>

            <div className="study-prompts">
                {quickPrompts.map(prompt => (
                    <button key={prompt} type="button" className="study-prompt" onClick={() => ask(prompt)} disabled={loading}>
                        {prompt}
                    </button>
                ))}
            </div>

            {answer && (
                <div className="study-answer" role="status">
                    <strong>{lesson?.title || course?.title || 'Your study guide'}</strong>
                    <p>{answer}</p>
                </div>
            )}

            {image && (
                <div className="study-image-preview">
                    <img src={image} alt="Question context" />
                    <button type="button" aria-label="Remove image" onClick={() => setImage(null)}><X size={15} /></button>
                </div>
            )}

            <form className="study-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
                <div className="study-input-wrap">
                    <input
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="What would you like to understand?"
                        aria-label="Ask the study assistant"
                        disabled={loading}
                    />
                    {provider === 'puter' && (
                        <label className="study-image-button" title="Attach an image (Puter mode)">
                            <ImagePlus size={18} />
                            <input type="file" accept="image/*" onChange={handleImage} disabled={loading} />
                        </label>
                    )}
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
                    {loading ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
                    <span>{loading ? 'Thinking' : 'Ask'}</span>
                </button>
            </form>
            <small>AI can make mistakes. Verify important information with your teacher or course notes.</small>
        </section>
    );
};

export default StudyAssistant;
