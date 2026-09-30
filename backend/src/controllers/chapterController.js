import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Chapter from '../models/Chapter.js';

// 📄 Chapter/Unit PDF upload — alag storage taaki chapter PDFs alag folder me rakhe (cleanup easy)
const chapterPdfDir = process.env.VERCEL ? '/tmp/uploads' : path.resolve('uploads');
if (!fs.existsSync(chapterPdfDir)) {
    fs.mkdirSync(chapterPdfDir, { recursive: true });
}

export const chapterPdfUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, chapterPdfDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
    }),
    fileFilter: (req, file, cb) => {
        const allowed = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        if (allowed) return cb(null, true);
        cb(new Error('Only PDF files are allowed!'));
    },
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
}).single('pdfFile');

import Lesson from '../models/Lesson.js';

// Naya Chapter banana
export const createChapter = async (req, res) => {
    try {
        const { title, moduleId, courseId, order } = req.body;
        const newChapter = await Chapter.create({ title, moduleId, courseId, order });
        res.status(201).json({ success: true, chapter: newChapter });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Module ke saare Chapters nikalna
export const getModuleChapters = async (req, res) => {
    try {
        const chapters = await Chapter.find({ moduleId: req.params.moduleId }).sort({ order: 1 });
        res.status(200).json({ success: true, chapters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Ek single chapter nikalna (GET /chapters/single/:chapterId)
export const getSingleChapter = async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.chapterId);
        if (!chapter) {
            return res.status(404).json({ success: false, message: "Chapter not found" });
        }
        res.status(200).json({ success: true, chapter });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Chapter update karna (PUT /chapters/:chapterId)
export const updateChapter = async (req, res) => {
    try {
        const chapterId = req.params.chapterId || req.body.chapterId;
        const updateFields = {};
        if (req.body.title !== undefined) updateFields.title = req.body.title;
        if (req.body.order !== undefined) updateFields.order = req.body.order;
        if (req.body.pdf !== undefined) updateFields.pdf = req.body.pdf;

        const updatedChapter = await Chapter.findByIdAndUpdate(chapterId, updateFields, { new: true });
        if (!updatedChapter) {
            return res.status(404).json({ success: false, message: "Chapter not found" });
        }
        res.status(200).json({ success: true, message: "Chapter updated successfully!", chapter: updatedChapter });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Chapter delete karna (uske lessons bhi)
export const deleteChapter = async (req, res) => {
    try {
        const chapterId = req.params.chapterId || req.body.chapterId;

        await Promise.all([
            Lesson.deleteMany({ chapterId }),
            Chapter.findByIdAndDelete(chapterId)
        ]);

        res.status(200).json({ success: true, message: "Chapter deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 📄 Chapter ka single PDF upload (POST /chapters/:chapterId/pdf) — "Add PDF" button
export const uploadChapterPdf = async (req, res) => {
    try {
        const chapterId = req.params.chapterId || req.body.chapterId;
        if (!chapterId) {
            return res.status(400).json({ success: false, message: 'chapterId is required' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please select a PDF to upload' });
        }

        const updatedChapter = await Chapter.findByIdAndUpdate(
            chapterId,
            { $push: { pdfs: { title: req.body.pdfTitle || 'Chapter PDF', file: req.file.filename } } },
            { new: true }
        );

        if (!updatedChapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Chapter PDF uploaded successfully!',
            chapter: updatedChapter
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading chapter PDF: ' + error.message });
    }
};

// 📄 Chapter PDF delete (DELETE /chapters/:chapterId/pdf/:pdfId)
export const deleteChapterPdf = async (req, res) => {
    try {
        const { chapterId, pdfId } = req.params;

        const updatedChapter = await Chapter.findByIdAndUpdate(
            chapterId,
            { $pull: { pdfs: { _id: pdfId } } },
            { new: true }
        );

        if (!updatedChapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found' });
        }

        res.status(200).json({ success: true, message: 'PDF removed!', chapter: updatedChapter });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error removing PDF' });
    }
};