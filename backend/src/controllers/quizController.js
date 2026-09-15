import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js'; 

// 1. क्विज बनाने का फंक्शन (Create)
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
        const quizzes = await Quiz.find({ lessonId: lessonId }); 

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

            const existingAttemptIndex = progress.quizAttempts.findIndex(
                attempt => attempt.lessonId.toString() === lessonId.toString()
            );

            const newAttempt = {
                lessonId: lessonId,
                score: score,
                totalMarks: totalMarks,
                answers: detailedAnswers
            };

            if (existingAttemptIndex >= 0) {
                progress.quizAttempts[existingAttemptIndex] = newAttempt;
            } else {
                progress.quizAttempts.push(newAttempt);
            }

            if (!progress.completedLessons.includes(lessonId)) {
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
        const { studentId } = req.query; // NAYA: Query se studentId lenge

        if (!studentId) {
            return res.status(200).json({ attempted: false });
        }

        const progress = await Progress.findOne({ 
            studentId: studentId, 
            "quizAttempts.lessonId": lessonId 
        });

        if (progress) {
            const attempt = progress.quizAttempts.find(a => a.lessonId.toString() === lessonId.toString());
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