import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Lesson title is required'],
        trim: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course', 
        required: true
    },
    videoUrl: {
        type: String,
        default: '' 
    },
    videoFile: {
        type: String,
        default: '' 
    },
    theoryContent: {
        type: String,
        default: '' 
    },
    attachment: {
        type: String,
        default: '' // Yahan file ka path save hoga
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        default: null // Kis chapter ke andar hai (null = unassigned)
    },
    // 🚀 REQUIREMENTS: Multiple study materials (PDF/code/images)
    materials: [{
        title: { type: String, default: 'Study Material' },
        file: { type: String, required: true }
    }],
    order: {
        type: Number,
        default: 1 
    }
}, { timestamps: true });

export default mongoose.model('Lesson', lessonSchema);