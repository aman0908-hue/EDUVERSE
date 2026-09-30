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
    // 📺 Topic — is lesson me kya padhaya gaya. Quiz isi topic se banegi.
    topic: {
        type: String,
        default: ''
    },
    // 🔴 LIVE CLASS LINK — teacher Google Meet / Zoom ka link yahan paste karta hai.
    //    Student is lesson ke button se seedha live class me chala jayega.
    liveLink: {
        type: String,
        default: ''
    },
    // 🔴 Live class kab hai (optional) — "Daily 6 PM" jaisi free text
    liveTime: {
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