import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Course description is required']
    },
    category: {
        type: String,
        required: [true, 'Course category is required']
    },
    // 🚀 REQUIREMENTS FIELDS: Level, Language, Requirements, Outcomes, Trailer
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    language: {
        type: String,
        default: 'English'
    },
    requirements: {
        type: [String], // Har line ek requirement
        default: []
    },
    learningOutcomes: {
        type: [String], // Har line ek learning outcome
        default: []
    },
    trailerVideo: {
        type: String,
        default: '' // Uploaded trailer file ka naam
    },
    price: {
        type: Number,
        default: 0 // 0 matlab free course
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Yeh us Teacher ki ID hogi jisne course banaya hai
        required: true
    },
    thumbnail: {
        type: String,
        default: '' // Course ki image ka link
    },
    isPublished: {
        type: Boolean,
        default: false // Jab tak teacher publish na kare, tab tak draft rahega
    }
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);