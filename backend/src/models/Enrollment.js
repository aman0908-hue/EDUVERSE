import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }
}, { timestamps: true });

// 📈 SCALING: teacher analytics (total students, course-wise counts) par in indexes kaam aate hain.
enrollmentSchema.index({ course: 1 });   // course ke enrolled students
enrollmentSchema.index({ student: 1 });  // student ke enrollments
// Ek student ek course me double-enroll na ho
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);