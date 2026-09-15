import Chapter from '../models/Chapter.js';
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