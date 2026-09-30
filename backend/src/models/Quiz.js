import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    lessonId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lesson', 
        // Ab optional hai — pure course ka final quiz lesson se juda nahi hota
        default: null
    },
    // 🏆 Final course quiz — courseId se course-wide quiz banaya ja sakta hai
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    // 📋 Quiz ka type — 'lesson' (topic quiz) ya 'course' (final exam)
    scope: {
        type: String,
        enum: ['lesson', 'course'],
        default: 'lesson'
    },
    // 📺 Topic jiske basis par quiz generate hua
    topic: { type: String, default: '' },
    // Quiz ka apna title (final exam ke liye zaroori hai)
    quizTitle: { type: String, default: '' },
    questionText: { 
        type: String, 
        required: true 
    },
    options: {
        type: [String],
        validate: [(val) => val.length === 4, 'Exactly 4 options are required']
    },
    correctAnswer: { 
        type: String, 
        required: true 
    },
    explanation: { 
        type: String, 
        default: '' 
    },
    marks: { 
        type: Number, 
        default: 1 
    },
    difficulty: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'], 
        default: 'medium' 
    }
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);