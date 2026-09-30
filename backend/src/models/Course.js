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
    // 🎓 GRADE / CLASS — kis class ke students ke liye ye course hai (5 se 12, UG, ya All).
    // 'All' = sabko dikhega. Student sirf apne grade (+ All) ke courses hi dekhega.
    grade: {
        type: String,
        enum: ['5', '6', '7', '8', '9', '10', '11', '12', 'UG', 'All'],
        default: 'All'
    },
    // 🌍 Language courses ke liye — kaunsi language padhayi ja rahi hai
    // (category = 'Language' tab hi relevant hai)
    courseLanguage: {
        type: String,
        default: ''
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
    },
    // 📅 CLASS SCHEDULE — AI "kab hai meri class?" poochne par yahi use karta hai
    schedule: [{
        label: { type: String, default: '' },        // "Week 1 — Intro to Node"
        day: {                                       // weekly slot ka din
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            default: 'Monday'
        },
        startTime: { type: String, default: '10:00' },  // 24h HH:MM
        endTime: { type: String, default: '11:00' },
        date: { type: String, default: '' },            // one-off class ke liye (YYYY-MM-DD)
        isLive: { type: Boolean, default: true },       // live class vs recorded session
        meetingLink: { type: String, default: '' }
    }],
    scheduleNote: { type: String, default: '' }  // Free-text note, e.g. "Lab every Saturday"
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);