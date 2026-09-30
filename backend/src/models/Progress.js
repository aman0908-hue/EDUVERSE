import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    courseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true 
    },
    completedLessons: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lesson' 
    }],
    // NAYA: Quiz ke attempts aur answers track karne ke liye
    quizAttempts: [{
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
        score: Number,
        totalMarks: Number,
        // Kab attempt hua — teacher analytics ("aaj kitne quiz diye") isi par chalta hai
        attemptedAt: { type: Date, default: Date.now },
        answers: [{
            questionText: String,
            selectedOption: String,
            correctAnswer: String,
            isCorrect: Boolean
        }]
    }]
}, { timestamps: true });

// 📈 SCALING: students badhne par ye queries fast rahein.
// teacherGuide har sawaal par Progress/Enrollment read karta hai — bina index ke slow ho jata hai.
progressSchema.index({ courseId: 1, updatedAt: -1 }); // attendance / activity
progressSchema.index({ studentId: 1, courseId: 1 });   // per-student course progress
progressSchema.index({ 'quizAttempts.attemptedAt': -1 }); // quiz recency

export default mongoose.model('Progress', progressSchema);