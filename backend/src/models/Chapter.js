import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, default: 0 },
    // 📄 Chapter/Unit ka PDF notes — teacher chapter banate waqt ya baad me upload kar sakta hai
    pdf: { type: String, default: '' },
    // 📄 Ek chapter me ek se zyada PDF (notes, worksheet, etc.)
    pdfs: [{
        title: { type: String, default: 'Chapter PDF' },
        file: { type: String, required: true }
    }]
}, { timestamps: true });

export default mongoose.model('Chapter', chapterSchema);