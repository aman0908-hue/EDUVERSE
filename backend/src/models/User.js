import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['student', 'teacher', 'admin'],
        default: 'student' 
    },
    // 🎓 Student ka current class (5 se 12, UG). Teacher ke liye 'All'.
    // Student sirf apne grade ke courses dekhega — isliye registration me poochha jata hai.
    grade: {
        type: String,
        enum: ['5', '6', '7', '8', '9', '10', '11', '12', 'UG', 'All'],
        default: 'All'
    },
    // 👨‍🏫 Teacher kis-kis class ko padhata hai. Empty matlab "sab ke liye".
    teachesGrades: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: { 
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('User', userSchema);