import { callChatCompletion, getAiConfig, getPublicAiStatus } from '../config/aiConfig.js';
import {
    buildGroundedSystemPrompt,
    isDisallowedRequest,
    isTeacherOwnStudentsScope,
    REFUSAL_MESSAGE,
    sanitizeAiOutput
} from '../utils/aiGuardrails.js';
import { buildGuideFallback, buildGuideFacts, buildStudentGuide, isStudentGuideQuestion } from '../services/studentGuide.js';
import { buildTeacherFallback, buildTeacherFacts, buildTeacherGuide, isTeacherGuideQuestion } from '../services/teacherGuide.js';

/**
 * Error ko user-friendly message me badalta hai.
 * Pehle generic "temporarily unavailable" dikhta tha — ab exact reason bata rahe hain.
 */
// AI kabhi kabhi apne aap "personal data" maan ke mana kar deta hai.
// Aisa kare to code me bana hua accurate answer use kar lete hain.
const AI_REFUSAL_SIGNALS = /\b(cannot|can't|can not|unable to)\s+(access|view|see|share|retrieve|read|provide|look up)|do not have access|don't have access|no access to your|not able to (access|view)|personal account information|your personal (data|information)\b/i;

const isAiRefusal = text => AI_REFUSAL_SIGNALS.test(String(text || ''));

/**
 * AI kabhi "personal data" bolke mana kar deta hai — is project me students
 * apna data ya teacher apne students ka data puchh sakte hain, isliye hum
 * aise jawab ko sahi maankar code se banaya hua accurate jawab se replace karte hain.
 */
const AI_STUDENT_REFUSAL = /\bpersonal\s+data\b|\bstudent\s+lists?\b|\bpersonal\s+information\b/i;
const isStudyRefusal = text =>
    isAiRefusal(text) || AI_STUDENT_REFUSAL.test(String(text || ''));

/**
 * Teacher assistant ka output sanitize — students ka email/phone kabhi
 * na nikle. Sirf naam, counts aur analytics dikhte hain.
 */
const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g;
const PHONE_PATTERN = /\b(?:\+?\d{1,2}[\s-]?)?\d{5}[\s-]?\d{5}\b/g;
const sanitizeTeacherOutput = text => sanitizeAiOutput(text).replace(EMAIL_PATTERN, '[hidden]');

const buildAiErrorMessage = error => {
    const message = String(error?.message || '');
    if (/rejected \(|401|403|invalid.*key|api key/i.test(message)) {
        return 'The AI provider rejected the API key. An admin can update it from Admin Console → AI Settings.';
    }
    if (/busy \(503\)|429|rate limit|overloaded/i.test(message)) {
        return 'The AI provider is busy right now. Please try again in a moment.';
    }
    if (/not available|404/i.test(message)) {
        return 'The selected AI model is not available. An admin can change it in Admin Console → AI Settings.';
    }
    if (/empty answer/i.test(message)) {
        return 'The AI did not return an answer this time. Please rephrase your question and try again.';
    }
    return 'The AI assistant is temporarily unavailable. Please try again.';
};

/**
 * Study assistant endpoint.
 * Uses an OpenAI-compatible chat completions API when configured, otherwise
 * returns a safe local study guide so the product remains useful without a key.
 */
/**
 * Built-in tutor engine. Runs fully offline (no API key required) and produces
 * genuinely useful, structured teaching responses by analysing the question
 * intent, length and keywords. Used when no external AI provider is configured.
 */
const buildFallbackAnswer = ({ question, lesson, course }) => {
    const topic = lesson?.title || course?.title || null;
    const notes = String(lesson?.theoryContent || '').replace(/\s+/g, ' ').trim();
    const q = String(question || '').trim();
    const ql = q.toLowerCase();
    const sentences = notes ? notes.match(/[^.!?]+[.!?]?/g)?.map(s => s.trim()).filter(s => s.length > 25) || [] : [];

    // ---- Greetings / small talk ----
    // "hi" jaise greetings pe study framework bekaar lagta hai, isliye alag se handle karte hain.
    // Anchored + short limit taaki "hey there" bhi match ho par "hey explain closures" na ho.
    const isGreeting = /^\s*(hi|hey|hello|hola|namaste|yo|hiya|howdy|sup|yo+|good\s*(morning|afternoon|evening|night|day)|what'?s\s*up|whats\s*up|how\s*are\s*you|how\s*r\s*u|how\s*you\s*doing)\b[\s\w']{0,12}[.!?]*$/i.test(q);
    if (isGreeting) {
        const timeOfDay = (() => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good morning';
            if (hour < 17) return 'Good afternoon';
            return 'Good evening';
        })();
        return `${timeOfDay}! 👋 I'm your ATs Learning Study Assistant.\n\nI can help you with:\n\n• **Explaining** a concept in simple words\n• **Summarising** your lesson notes\n• **Creating practice questions** to test yourself\n• **Making a revision plan** before an exam\n• **Debugging** an error you are stuck on\n\n${topic ? `You're currently on **${topic}** — want a quick summary of it?` : 'What are you working on today?'}`;
    }

    // ---- Thanks / sign-off ----
    if (/^\s*(thanks?|thank\s*you|thx|ty|ok(ay)?|cool|great|awesome|perfect|got\s*it|bye|goodbye|see\s*you|see\s*ya)\b[\s!.?]*$/i.test(q)) {
        return `Glad I could help! 😊\n\nWhenever you're ready, ask me to **summarise** a lesson, **quiz** you on a topic, build a **study plan**, or **debug** an error. I'm here.`;
    }

    // ---- Who are you / what can you do ----
    // Sirf tab jab sawaal chhota ho — "help me debug this" jaise asli question pe na atke
    if (q.length < 45 && /who\s*(are|r)\s*you|what\s*are\s*you|your\s*name|what\s*can\s*you\s*do|^help$|^help\s*me$|what\s*do\s*you\s*do/i.test(ql)) {
        return `I'm the **ATs Learning Study Assistant** — a built-in offline tutor.\n\nI work without any internet or API key, and I can:\n\n1. **Explain** any topic in simple, beginner-friendly words\n2. **Summarise** your current lesson notes into clear points\n3. **Quiz** you with practice questions on the topic\n4. **Plan** your revision so you are exam-ready\n5. **Walk through** an error message and help you debug it\n\nJust type what you need — for example *"explain closures"*, *"give me a 3-question quiz"*, or *"make a study plan"*.`;
    }

    // Bahut chhota aur unclear input — pehle puchho
    if (q.length < 3) {
        return `I did not quite catch that. Could you type your question in a bit more detail?\n\nFor example:\n• *"Explain recursion in simple words"*\n• *"Summarise this lesson"*\n• *"Give me 3 practice questions"*`;
    }

    const studySteps = (title) => `Here is a simple plan to master ${title || 'this topic'}:\n\n1. **Understand the core idea** — Read the definition in your own words.\n2. **Break it into parts** — Identify the inputs, the process, and the output.\n3. **Work through one example** — Copy the same pattern with new values.\n4. **Test yourself** — Close the material and explain it from memory.\n5. **Review mistakes** — Revisit only the parts you got wrong.\n\nQuick self-check: can you explain ${title || 'this topic'} in under 60 seconds?`;

    const quiz = (title) => {
        const t = title || 'this topic';
        return `Practice questions on ${t}:\n\n**Q1.** In one sentence, what is the main purpose of ${t}?\n**Q2.** Where would you realistically use ${t} in a real project or situation?\n**Q3.** What is the most common mistake beginners make with ${t}, and how would you avoid it?\n\nAnswer all three before checking your notes — active recall is what makes learning stick.`;
    };

    if (/summar/i.test(ql)) {
        if (sentences.length >= 2) {
            return `Summary of ${topic || 'the topic'}:\n\n${sentences.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nNow close the material and write these points from memory to check what actually stuck.`;
        }
        return `To create a good summary of ${topic || 'this topic'}, focus on four things:\n\n1. **The definition** — what it is, in one line.\n2. **The purpose** — why it exists or why it matters.\n3. **The key parts** — the 3–5 components that matter most.\n4. **The use case** — where it applies in practice.\n\n${studySteps(topic)}`;
    }

    if (/quiz|test|exam|mcq|practice question|question paper/i.test(ql)) {
        return quiz(topic);
    }

    if (/plan|schedule|revision|study plan|prepare|exam.*prepar/i.test(ql)) {
        return studySteps(topic);
    }

    if (/example|demo|practical|real.?life|use case|application/i.test(ql)) {
        return `Practical example for ${topic || 'your question'}:\n\n1. **The situation** — Describe a simple real-world scenario where this applies.\n2. **The goal** — State clearly what you want to achieve.\n3. **The approach** — Show the concept applied step by step.\n4. **The outcome** — Explain what changed and why it worked.\n\nTry modifying one value in the example and predict the new result before running it — that is how real understanding is built.`;
    }

    if (/simple|easy|beginner|basic|easily|explain.*simple/i.test(ql)) {
        return `Let me break this down simply.\n\n**In one line:** ${q} is best understood by focusing on what goes in, what happens, and what comes out.\n\n**Analogy:** Think of it like a recipe — you follow steps in order to produce a result.\n\n**Why it matters:** Once you see the pattern, you can reuse it instead of memorising every detail.\n\n**Next step:** Try explaining it to someone else in your own words. If you get stuck, that is the exact part to revise.\n\n${topic ? `This is in the context of your lesson: ${topic}.` : ''}`;
    }

    if (/differ|vs|versus|compare|difference between/i.test(ql)) {
        return `To compare these clearly, check these four angles:\n\n1. **Definition** — what each one fundamentally is.\n2. **Purpose** — the problem each one solves.\n3. **Strengths** — where each one wins.\n4. **Limitations** — where each one fails.\n\nA small comparison table with these four rows is usually the fastest way to make the difference stick permanently.`;
    }

    if (/how|step|process|procedure|steps to/i.test(ql)) {
        return `Step-by-step process:\n\n1. **Clarify the goal** — Write down exactly what success looks like.\n2. **Gather what you need** — Collect the required inputs or prerequisites.\n3. **Start with the simplest version** — Get a basic working solution first.\n4. **Test and refine** — Check the result, fix what breaks, repeat.\n5. **Document it** — Write down what worked so you can repeat it.\n\nStart small and make it work, then make it work well.`;
    }

    if (/error|not working|fail|bug|issue|problem|why.*not/i.test(ql)) {
        return `Let us debug this systematically:\n\n1. **Read the actual error** — copy the exact message, do not guess.\n2. **Reproduce it** — find the smallest case that fails consistently.\n3. **Isolate** — comment out or remove parts until the cause is clear.\n4. **Check the obvious** — typos, wrong variable, missing import, wrong path.\n5. **Fix one thing at a time** — change, test, verify.\n\nIf you share the exact error message, I can help you narrow it down much faster.`;
    }

    if (notes && sentences.length >= 2) {
        return `Based on your lesson notes for ${topic || 'this topic'}:\n\n${sentences.slice(0, 4).map(s => `• ${s}`).join('\n')}\n\nHow does this connect to your question: ${q}?\n\n${studySteps(topic)}`;
    }

    return `Here is how I would approach **${q}**:\n\n1. **Clarify** — Pin down the exact question being asked.\n2. **Connect** — Link it to something you already understand well.\n3. **Apply** — Use it in a concrete example.\n4. **Explain back** — Teach it in your own words; that is real proof of understanding.\n\nAsk me a follow-up if you want me to go deeper on any single step.`;
};

/**
 * Lightweight authorization probe used before browser-side providers (Puter).
 * Returns 200 only when the logged-in user is allowed to access the course.
 */
export const checkAiAccess = async (req, res) => {
    const courseId = req.params.courseId;
    const lessonId = req.query.lessonId;
    const lesson = lessonId ? await req.app.locals.models?.Lesson?.findById(lessonId).select('title theoryContent').lean() : null;
    const course = await req.app.locals.models?.Course?.findById(courseId).select('title').lean();
    res.json({ success: true, course, lesson });
};

/**
 * General AI assistant. Requires login only (no course enrollment),
 * used by the standalone /ai-assistant page.
 */
export const askGeneralAssistant = async (req, res) => {
    try {
        const { question, courseId } = req.body || {};
        if (!question || !String(question).trim()) {
            return res.status(400).json({ message: 'Question is required.' });
        }

        const course = courseId ? await req.app.locals.models?.Course?.findById(courseId).select('title').lean() : null;
        const context = { question, course, lesson: null };
        // Config ab Admin Console se aata hai (.env fallback ke saath)
        const { apiKey, baseUrl, model, provider } = await getAiConfig();

        // Safety pehle — illegal / cheating / privacy-breaching request refuse karo.
        // 👨‍🏫 Teacher apne OWN students ke analytics (attendance/quiz/progress) puch sakta hai —
        // ye uska apna course hai. Email/phone/password jaisa contact data phir bhi block rahega.
        const teacherScope = isTeacherOwnStudentsScope(question, req.user?.role);
        if (isDisallowedRequest(question) && !teacherScope) {
            return res.json({ answer: REFUSAL_MESSAGE, mode: 'refused', provider: 'guardrails' });
        }

        // "Mera next class / quiz / progress?" — student ke apne data se jawab
        const wantsGuide = isStudentGuideQuestion(question);
        const guide = wantsGuide ? await buildStudentGuide(req.user._id) : null;
        const facts = wantsGuide ? buildGuideFacts(guide) : null;

        // 👨‍🏫 TEACHER ka apna alag assistant — students/attendance/quiz/revenue
        // Sirf teacher role ko, aur sirf uske KHUD ke students ka data.
        const isTeacher = req.user.role === 'teacher';
        const wantsTeacherGuide = isTeacher && isTeacherGuideQuestion(question);
        const teacherGuide = wantsTeacherGuide ? await buildTeacherGuide(req.user._id) : null;
        const teacherFacts = wantsTeacherGuide ? buildTeacherFacts(teacherGuide) : null;

        if (!apiKey) {
            if (wantsTeacherGuide) {
                return res.json({ answer: buildTeacherFallback(teacherGuide, question), mode: 'teacher-guide', provider: 'builtin' });
            }
            const answer = wantsGuide ? buildGuideFallback(guide, question) : buildFallbackAnswer(context);
            return res.json({ answer, mode: 'study-guide', provider: 'builtin' });
        }

        // 👨‍🏫 Teacher assistant — facts code me bane hain, AI sirf sundar banata hai
        if (wantsTeacherGuide) {
            const response = await callChatCompletion({
                config: { apiKey, baseUrl, model },
                maxTokens: 450,
                messages: [
                    {
                        role: 'system',
                        content: `You are the ATs Learning Teacher Assistant, a coaching analytics helper for a teacher on a learning platform.

Rules:
- Use ONLY the FACTS below. Never add, guess or change any number, name or count.
- These are the teacher's OWN students (they are enrolled in the teacher's own courses), so you SHOULD share this analytics. Never say you cannot access it.
- Present numbers in short bullet points with clear headings, under 200 words.
- If a fact says nobody was present or no quiz was attempted, say exactly that — do not soften or invent numbers.`
                    },
                    { role: 'user', content: `FACTS:\n${teacherFacts}\n\nThe teacher asked: "${question}"\n\nPresent these facts as a clear answer.` }
                ]
            });
            return res.json({
                answer: isStudyRefusal(response.text)
                    ? buildTeacherFallback(teacherGuide, question)
                    : sanitizeTeacherOutput(response.text),
                mode: 'ai',
                provider,
                model: response.model,
                guide: teacherGuide?.summary || null,
                teacher: true
            });
        }

        // Guide question ka answer facts code me build hota hai — AI sirf use
        // sundar bana raha hai, isliye answer hamesha 100% accurate rahega.
        if (wantsGuide) {
            const response = await callChatCompletion({
                config: { apiKey, baseUrl, model },
                maxTokens: 400,
                messages: [
                    {
                        role: 'system',
                        content: `You are the ATs Learning Study Assistant. Your job is to present the FACTS below to the student in a friendly, well-formatted way.

Rules:
- Use ONLY the facts given to you. Never add, guess or change any number, name or title.
- Never say you cannot access the student's data — this is their own data and you are meant to share it.
- Use short bullet points, keep it under 150 words, and end with one encouraging line.
- Do not invent class times or dates. Only use a day/date/time if it appears in the FACTS above; otherwise say no timetable is set.`
                    },
                    { role: 'user', content: `FACTS:\n${facts}\n\nThe student asked: "${question}"\n\nPresent these facts as a helpful answer.` }
                ]
            });
            return res.json({
                answer: isStudyRefusal(response.text)
                    ? buildGuideFallback(guide, question)
                    : sanitizeAiOutput(response.text),
                mode: 'ai',
                provider,
                model: response.model,
                guide: guide?.summary || null
            });
        }

        const response = await callChatCompletion({
            config: { apiKey, baseUrl, model },
            maxTokens: 500,
            messages: [
                {
                    role: 'system',
                    content: buildGroundedSystemPrompt({
                        course: course?.title,
                        lesson: null,
                        hasNotes: false,
                        studentGuide: null
                    })
                },
                {
                    role: 'user',
                    content: course
                        ? `Course: ${course.title}\n\nStudent question: ${question}`
                        : `Student question: ${question}`
                }
            ]
        });

        res.json({ answer: sanitizeAiOutput(response.text), mode: 'ai', provider, model: response.model });
    } catch (error) {
        console.error('General assistant error:', error.message);
        res.status(500).json({ message: buildAiErrorMessage(error) });
    }
};

/** Reports which AI provider the server is currently using. */
export const getAiStatus = async (req, res) => {
    // Status browser/proxy cache na ho — admin key change karte hi UI turant update ho
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(await getPublicAiStatus());
};

export const askStudyAssistant = async (req, res) => {
    try {
        const { question, courseId, lessonId } = req.body || {};
        if (!question || !String(question).trim()) {
            return res.status(400).json({ message: 'Question is required.' });
        }

        const lesson = lessonId ? await req.app.locals.models?.Lesson?.findById(lessonId).lean() : null;
        const course = courseId ? await req.app.locals.models?.Course?.findById(courseId).lean() : null;
        const context = { question, lesson, course };
        // Config ab Admin Console se aata hai (.env fallback ke saath)
        const { apiKey, baseUrl, model, provider } = await getAiConfig();

        // Safety pehle — illegal / cheating / privacy-breaching request refuse karo
        if (isDisallowedRequest(question)) {
            return res.json({ answer: REFUSAL_MESSAGE, mode: 'refused', provider: 'guardrails' });
        }

        if (!apiKey) {
            return res.json({ answer: buildFallbackAnswer(context), mode: 'study-guide', provider: 'builtin' });
        }

        const lessonContext = lesson
            ? `Lesson: ${lesson.title}\nNotes: ${String(lesson.theoryContent || '').slice(0, 4000)}`
            : `Course: ${course?.title || 'Enrolled course'}`;
        const response = await callChatCompletion({
            config: { apiKey, baseUrl, model },
            maxTokens: 350,
            messages: [
                {
                    role: 'system',
                    content: buildGroundedSystemPrompt({
                        course: course?.title,
                        lesson: lesson?.title,
                        hasNotes: Boolean(lesson?.theoryContent)
                    })
                },
                { role: 'user', content: `${lessonContext}\n\nStudent question: ${question}` }
            ]
        });

        res.json({ answer: sanitizeAiOutput(response.text), mode: 'ai', provider, model: response.model });
    } catch (error) {
        console.error('Study assistant error:', error.message);
        res.status(500).json({ message: buildAiErrorMessage(error) });
    }
};
