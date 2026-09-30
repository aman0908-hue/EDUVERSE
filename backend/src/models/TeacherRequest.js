import mongoose from 'mongoose';

/**
 * Teacher approval requests. A public user submits a request at register time;
 * only after an admin approves it does the user become a teacher.
 */
const teacherRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    qualification: { type: String, default: '' },
    experience: { type: String, default: '' },
    subject: { type: String, default: '' },
    reason: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewNote: { type: String, default: '' },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

export default mongoose.model('TeacherRequest', teacherRequestSchema);
