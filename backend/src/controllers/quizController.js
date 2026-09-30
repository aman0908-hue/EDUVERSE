import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js'; 
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import { callChatCompletion, getAiConfig } from '../config/aiConfig.js';

// ============================================================================
// 🤖 AI QUIZ GENERATOR
// ============================================================================

// AI output ko JSON me nikalne ki koshish. Models aksar ```json ... ``` code fence
// ya aage ke explanation text me se JSON chhupa dete hain.
const extractJson = (text) => {
    const raw = String(text || '').trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : raw;
    const start = candidate.search(/[[{]/);
    if (start === -1) return null;
    const end = Math.max(candidate.lastIndexOf(']'), candidate.lastIndexOf('}'));
    if (end === -1 || end < start) return null;
    try {
        return JSON.parse(candidate.slice(start, end + 1));
    } catch (error) {
        return null;
    }
};

// Model se sirf 4 unique options + sahi jawab validate karo (4 ka rule model bhool jaata hai)
const normalizeQuestion = (q) => {
    if (!q || typeof q !== 'object') return null;
    const questionText = String(q.questionText || q.question || '').trim();
    if (!questionText) return null;

    const options = Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()) : [];
    if (options.length !== 4 || options.some(o => !o)) return null;
    if (new Set(options).size !== 4) return null;

    let correctIndex = -1;
    if (Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4) {
        correctIndex = q.correctIndex;
    } else if (q.correctAnswer !== undefined) {
        const asIndex = Number(q.correctAnswer);
        if (Number.isInteger(asIndex) && asIndex >= 0 && asIndex < 4) {
            correctIndex = asIndex;
        } else {
            correctIndex = options.findIndex(o => o.toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
        }
    }
    if (correctIndex < 0) return null;

    return {
        questionText,
        options,
        correctAnswer: options[correctIndex],
        explanation: String(q.explanation || '').trim(),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        marks: Number.isFinite(Number(q.marks)) && Number(q.marks) > 0 ? Number(q.marks) : 1
    };
};

const QUIZ_SYSTEM_PROMPT = `You are an exam question setter for an online learning platform.
You write multiple-choice questions for students.

STRICT RULES:
- Reply with ONLY a JSON array. No explanation before or after it.
- No markdown code fences.
- Each item must have exactly this shape:
  {"questionText":"the question","options":["A","B","C","D"],"correctIndex":0,"explanation":"why this answer is correct","difficulty":"easy|medium|hard","marks":1}
- "options" MUST have exactly 4 different values.
- "correctIndex" is the 0-based index of the right option inside "options".
- Questions must be answerable using ONLY the notes you are given. Never invent facts.
- Keep each option under 90 characters. Keep the question under 220 characters.`;

// AI key na ho tab bhi quiz ban jaayega — lesson ke notes se hi sawaal banate hain.
// Offline mode me options asli notes ki lines hoti hain, isliye answers accurate rehte hain.
const TOPIC_STARTERS = [
    t => `Which statement about ${t} is correct?`,
    t => `In ${t}, the most important idea to remember is:`,
    t => `Which of the following best describes ${t}?`,
    t => `Which option correctly explains ${t}?`,
    t => `What is the main purpose of ${t}?`,
    t => `Which fact about ${t} is accurate?`
];

const buildOfflineQuestions = ({ topic, notes, count }) => {
    const cleanTopic = String(topic || 'this topic').trim();
    // Notes se asli statements nikaalte hain — inhi ko options banate hain
    const statements = String(notes || '')
        .split(/(?<=[.!?])\s+|\n+/)
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length >= 25 && s.length <= 200)
        .slice(0, 12);

    const questions = [];
    for (let i = 0; i < count; i++) {
        if (statements.length >= 4) {
            const correct = statements[i % statements.length];
            const others = [];
            // 3 distractor — dusri notes lines, kam padhne par placeholder
            for (const s of statements) {
                if (s !== correct && others.length < 3) others.push(s);
            }
            while (others.length < 3) others.push(`This is not covered in the notes for ${cleanTopic}.`);

            const options = [correct, ...others];
            options.sort(() => Math.random() - 0.5); // sahi jawab hamesha pehle na rahe
            questions.push({
                questionText: TOPIC_STARTERS[i % TOPIC_STARTERS.length](cleanTopic),
                options,
                correctAnswer: correct,
                explanation: `From the lesson notes: "${correct}"`,
                difficulty: i % 3 === 0 ? 'easy' : (i % 3 === 1 ? 'medium' : 'hard'),
                marks: 1
            });
        } else {
            // Notes bahut kam hain — teacher manually edit kar lega
            questions.push({
                questionText: TOPIC_STARTERS[i % TOPIC_STARTERS.length](cleanTopic),
                options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                correctAnswer: 'Option 1',
                explanation: 'Not enough notes found to build this automatically — please edit this question.',
                difficulty: 'medium',
                marks: 1
            });
        }
    }
    return questions;
};

// ============================================================================
// 🤖 AI QUIZ GENERATOR — POST /quizzes/generate
// Body: { lessonId } ya { courseId, topic?, count?, difficulty? }
// ============================================================================
export const generateQuiz = async (req, res) => {
    try {
        const { lessonId, courseId, topic, difficulty: wantDifficulty, count: wantCount } = req.body || {};

        if (!lessonId && !courseId) {
            return res.status(400).json({ success: false, message: 'lessonId ya courseId chahiye' });
        }

        const count = Math.min(Math.max(parseInt(wantCount, 10) || 5, 1), 20);

        let notes = '';
        let finalTopic = String(topic || '').trim();
        let resolvedCourseId = courseId || null;

        if (lessonId) {
            const lesson = await Lesson.findById(lessonId).lean();
            if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
            finalTopic = finalTopic || lesson.topic || lesson.title;
            notes = lesson.theoryContent || '';
            resolvedCourseId = lesson.courseId || null;
        } else {
            const course = await Course.findById(courseId).lean();
            if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
            finalTopic = finalTopic || course.title;
            const courseLessons = await Lesson.find({ courseId }).sort({ order: 1 }).lean();
            notes = courseLessons
                .map(l => `Lesson: ${l.title}\n${l.theoryContent || ''}`)
                .join('\n\n')
                .slice(0, 12000);
        }

        if (!notes.trim()) {
            return res.status(400).json({ success: false, message: 'Quiz banane ke liye pehle lesson me notes/theory likhna zaroori hai.' });
        }

        const { apiKey, baseUrl, model } = await getAiConfig();
        let questions = [];
        let mode = 'offline';

        if (apiKey) {
            try {
                const response = await callChatCompletion({
                    config: { apiKey, baseUrl, model },
                    maxTokens: 2000,
                    temperature: 0.4,
                    messages: [
                        { role: 'system', content: QUIZ_SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: `Topic: ${finalTopic}\n\nGenerate ${count} multiple-choice questions.\nDifficulty: ${wantDifficulty || 'medium'}\n\nNOTES (use only these):\n${notes.slice(0, 10000)}`
                        }
                    ]
                });
                const parsed = extractJson(response.text);
                if (Array.isArray(parsed)) questions = parsed.map(normalizeQuestion).filter(Boolean);
                if (questions.length) mode = 'ai';
            } catch (error) {
                console.error('AI quiz generation failed, offline fallback chalega:', error.message);
            }
        }

        if (!questions.length) questions = buildOfflineQuestions({ topic: finalTopic, notes, count });

        const scope = lessonId ? 'lesson' : 'course';
        const base = { lessonId: lessonId || null, courseId: resolvedCourseId, scope, topic: finalTopic };
        const saved = await Quiz.insertMany(questions.map(q => ({ ...base, ...q })));

        res.status(201).json({
            success: true,
            message: `${saved.length} questions generate ho gaye!`,
            mode,
            topic: finalTopic,
            scope,
            quizzes: saved
        });
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ success: false, message: 'Error generating quiz: ' + error.message });
    }
};

/**
 * 🏆 Final course quiz ke saare questions (GET /quizzes/course/:courseId)
 * lessonId null wale + scope 'course' wale questions laata hai.
 */
export const getCourseQuizzes = async (req, res) => {
    try {
        const { courseId } = req.params;
        const quizzes = await Quiz.find({ courseId, scope: 'course' });
        res.status(200).json({ success: true, quizzes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching course quiz' });
    }
};

export const createQuiz = async (req, res) => {
    try {
        const { lessonId, questionText, options, correctAnswer, explanation, marks, difficulty } = req.body;
        const quiz = await Quiz.create({ lessonId, questionText, options, correctAnswer, explanation, marks, difficulty });
        res.status(201).json({ success: true, quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. क्विज निकालने का फंक्शन (Get)
export const getLessonQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ lessonId: req.params.lessonId });
        res.status(200).json({ success: true, quizzes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. क्विज अपडेट करने का फंक्शन (PUT)
export const updateQuiz = async (req, res) => {
    try {
        const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, message: "Quiz updated!", quiz: updatedQuiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. क्विज डिलीट करने का फंक्शन (DELETE)
export const deleteQuiz = async (req, res) => {
    try {
        await Quiz.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Quiz deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. 🚀 FIX: Ab Frontend se 'studentId' aayega
export const submitQuiz = async (req, res) => {
    try {
        // NAYA: studentId body se le rahe hain
        const { courseId, lessonId, answers, studentId } = req.body; 
        // Final course quiz me lessonId null hota hai — tab courseId se saare questions lao
        const quizzes = lessonId
            ? await Quiz.find({ lessonId: lessonId })
            : await Quiz.find({ courseId: courseId, scope: 'course' });

        let score = 0;
        let totalMarks = 0;
        const detailedAnswers = []; 
        
        quizzes.forEach((quiz) => {
            const quizIdStr = quiz._id.toString();
            const studentAnswer = answers[quizIdStr] || "";
            
            const isCorrect = studentAnswer.trim() === quiz.correctAnswer.trim();
            const marksForThisQuestion = quiz.marks || 1; 

            if (isCorrect) {
                score += marksForThisQuestion;
            }
            totalMarks += marksForThisQuestion;

            detailedAnswers.push({
                questionText: quiz.questionText,
                selectedOption: studentAnswer,
                correctAnswer: quiz.correctAnswer,
                isCorrect: isCorrect
            });
        });

        // 🚀 req.user ki jagah direct studentId use kar rahe hain
        if (studentId) {
            let progress = await Progress.findOne({ studentId: studentId, courseId: courseId });
            
            if (!progress) {
                progress = new Progress({
                    studentId: studentId,
                    courseId: courseId,
                    completedLessons: [],
                    quizAttempts: []
                });
            }

            // Final course quiz me lessonId null hota hai — uske liye scope key use karo
            const attemptKey = lessonId || `course:${courseId}`;

            const existingAttemptIndex = progress.quizAttempts.findIndex(
                attempt => String(attempt.lessonId || `course:${attempt.courseId}`) === String(attemptKey)
            );

            const newAttempt = {
                lessonId: lessonId || null,
                courseId: courseId,
                score: score,
                totalMarks: totalMarks,
                // Teacher analytics ke liye — kab attempt hua
                attemptedAt: new Date(),
                answers: detailedAnswers
            };

            if (existingAttemptIndex >= 0) {
                progress.quizAttempts[existingAttemptIndex] = newAttempt;
            } else {
                progress.quizAttempts.push(newAttempt);
            }

            // Sirf lesson quiz ko completedLessons me daalo — course quiz lesson nahi hai
            if (lessonId && !progress.completedLessons.includes(lessonId)) {
                progress.completedLessons.push(lessonId);
            }

            await progress.save();
        }

        res.status(200).json({ 
            success: true, 
            score: score, 
            totalQuestions: quizzes.length,
            message: "Quiz submitted successfully!" 
        });

    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ success: false, message: "Error submitting quiz" });
    }
};

// 6. 🚀 NAYA FUNCTION: Status check karne ke liye bhi studentId lenge
export const getQuizAttemptStatus = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { studentId, courseId } = req.query; // courseId course-quiz status ke liye chahiye

        if (!studentId) {
            return res.status(200).json({ attempted: false });
        }

        const progress = await Progress.findOne({ 
            studentId: studentId, 
            "quizAttempts.lessonId": lessonId 
        });

        if (progress) {
            // Lesson quiz ke liye lessonId, course quiz ke liye 'course:<id>' se match karo
            const attemptKey = lessonId || `course:${courseId}`;
            const attempt = progress.quizAttempts.find(
                a => String(a.lessonId || `course:${a.courseId}`) === String(attemptKey)
            );
            if (attempt) {
                return res.status(200).json({ 
                    attempted: true, 
                    score: attempt.score,
                    totalMarks: attempt.totalMarks || attempt.answers.length,
                    answers: attempt.answers 
                });
            }
        }

        res.status(200).json({ attempted: false });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};