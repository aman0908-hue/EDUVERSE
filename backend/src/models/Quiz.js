import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    lessonId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Lesson', 
        required: true 
    },
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