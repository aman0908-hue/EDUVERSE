import Progress from '../models/Progress.js';
import Lesson from '../models/Lesson.js'; 

// 🚀 NAYA: Lecture ko incomplete mark karna (POST /progress/mark-incomplete)
export const markIncomplete = async (req, res) => {
    try {
        const { studentId, courseId, lessonId } = req.body;

        if (!studentId || !courseId || !lessonId) {
            return res.status(400).json({ success: false, message: "Missing studentId, courseId or lessonId" });
        }

        const progress = await Progress.findOneAndUpdate(
            { studentId, courseId },
            { $pull: { completedLessons: lessonId } },
            { new: true }
        );

        res.status(200).json({ success: true, message: "Marked as incomplete!", progress: progress || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Quiz progress nikalna (GET /progress/quiz-progress/:studentId/:courseId)
export const getQuizProgress = async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        const progress = await Progress.findOne({ studentId, courseId });

        if (!progress) {
            return res.status(200).json({ success: true, quizAttempts: [], completedLessons: [] });
        }

        // Har attempt ke liye percentage bhi calculate kar do
        const quizProgress = (progress.quizAttempts || []).map(attempt => ({
            lessonId: attempt.lessonId,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            percentage: attempt.totalMarks ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0,
            answers: attempt.answers
        }));

        res.status(200).json({ success: true, quizAttempts: quizProgress, completedLessons: progress.completedLessons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markComplete = async (req, res) => {
    try {
        const { studentId, courseId, lessonId } = req.body;
        
        if (!studentId || !courseId) {
            return res.status(400).json({ success: false, message: "Missing studentId or courseId" });
        }

        let progress = await Progress.findOne({ studentId, courseId });
        
        if (!progress) {
            progress = await Progress.create({ studentId, courseId, completedLessons: [lessonId] });
        } else {
            if (!progress.completedLessons.includes(lessonId)) {
                progress.completedLessons.push(lessonId);
                await progress.save();
            }
        }
        res.status(200).json({ success: true, message: "Marked as complete!", progress });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProgress = async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        const progress = await Progress.findOne({ studentId, courseId });
        res.status(200).json({ success: true, progress });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitQuizAttempt = async (req, res) => {
    try {
        const { studentId, courseId, lessonId, score, totalMarks, answers } = req.body;

        if (!studentId || !courseId || !lessonId) {
            console.log("Missing Data:", { studentId, courseId, lessonId });
            return res.status(400).json({ success: false, message: "Student, Course ya Lesson ID missing hai!" });
        }

        let progress = await Progress.findOne({ studentId, courseId });

        if (!progress) {
            progress = new Progress({ 
                studentId, 
                courseId, 
                completedLessons: [], 
                quizAttempts: [] 
            });
        }

        if (!progress.quizAttempts) {
            progress.quizAttempts = [];
        }

        const existingAttemptIndex = progress.quizAttempts.findIndex(
            q => q.lessonId && q.lessonId.toString() === lessonId.toString()
        );
        
        if (existingAttemptIndex > -1) {
            progress.quizAttempts[existingAttemptIndex] = { lessonId, score, totalMarks, answers };
        } else {
            progress.quizAttempts.push({ lessonId, score, totalMarks, answers });
        }

        await progress.save();
        res.status(200).json({ success: true, message: "Quiz result saved successfully!" });

    } catch (error) {
        console.error("Backend Quiz Save Error:", error); 
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 🚀 YAHAN UPDATE KIYA HAI: Teacher Analytics me Sahi Score Dikhane Ke Liye ---
export const getCourseAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // 1. Saare students ka progress nikaalo is course ke liye
        const allProgress = await Progress.find({ courseId }).populate('studentId', 'name email');
        
        // 2. Har student ke data me se quiz attempts count karo
        const analyticsData = allProgress.map(prog => {
            
            // Total kitne quiz attempt kiye hain usne
            const attemptedQuizzes = prog.quizAttempts ? prog.quizAttempts.length : 0;
            
            // Uska total score kitna hua saare quizzes milakar
            let totalScore = 0;
            if (prog.quizAttempts) {
                prog.quizAttempts.forEach(attempt => {
                    totalScore += attempt.score || 0;
                });
            }

            return {
                _id: prog._id,
                studentId: prog.studentId,
                courseId: prog.courseId,
                completedLessons: prog.completedLessons,
                quizAttempts: prog.quizAttempts,
                
                // Ye custom fields bhej rahe hain taaki Teacher UI me direct dikh jaye
                totalAttemptedQuizzes: attemptedQuizzes,
                totalScoreObtained: totalScore,
                
                createdAt: prog.createdAt,
                updatedAt: prog.updatedAt
            };
        });

        res.status(200).json({ success: true, analytics: analyticsData });
    } catch (error) {
        console.error("Error in getCourseAnalytics:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Student Dashboard Data Fetch Karna ---
export const getStudentDashboard = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Student ke saare progress records nikalna aur Course details jorna
        const userProgress = await Progress.find({ studentId }).populate('courseId');

        // Har course mein total kitne lessons hain, aur progress % nikalna
        const dashboardData = await Promise.all(userProgress.map(async (prog) => {
            const courseId = prog.courseId?._id;
            if (!courseId) return null; // Agar course delete ho gaya ho

            const totalLessons = await Lesson.countDocuments({ courseId: courseId });
            const completedCount = prog.completedLessons.length;
            const progressPercentage = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

            return {
                course: prog.courseId,
                completedLessons: completedCount,
                totalLessons: totalLessons,
                progressPercentage: progressPercentage,
                quizAttempts: prog.quizAttempts
            };
        }));

        // Null values hatana
        const filteredData = dashboardData.filter(data => data !== null);

        res.status(200).json({ success: true, dashboardData: filteredData });
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};