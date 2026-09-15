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
        answers: [{
            questionText: String,
            selectedOption: String,
            correctAnswer: String,
            isCorrect: Boolean
        }]
    }]
}, { timestamps: true });

export default mongoose.model('Progress', progressSchema);