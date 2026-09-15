import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';

// Naya Module banana
export const createModule = async (req, res) => {
    try {
        const { title, courseId, order } = req.body;
        const newModule = await Module.create({ title, courseId, order });
        res.status(201).json({ success: true, module: newModule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Course ke saare Modules nikalna
export const getCourseModules = async (req, res) => {
    try {
        const modules = await Module.find({ courseId: req.params.courseId }).sort({ order: 1 });
        res.status(200).json({ success: true, modules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Ek single module nikalna (GET /modules/single-module/:moduleId)
export const getSingleModule = async (req, res) => {
    try {
        const singleModule = await Module.findById(req.params.moduleId);
        if (!singleModule) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, module: singleModule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Module update karna (PUT /modules/:moduleId)
export const updateModule = async (req, res) => {
    try {
        const moduleId = req.params.moduleId || req.body.moduleId;
        const updateFields = {};
        if (req.body.title !== undefined) updateFields.title = req.body.title;
        if (req.body.order !== undefined) updateFields.order = req.body.order;

        const updatedModule = await Module.findByIdAndUpdate(moduleId, updateFields, { new: true });
        if (!updatedModule) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, message: "Module updated successfully!", module: updatedModule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🚀 NAYA: Module delete karna (uske chapters + lessons bhi)
export const deleteModule = async (req, res) => {
    try {
        const moduleId = req.params.moduleId || req.body.moduleId;

        // Module ke chapters nikalo, phir unke lessons delete karo
        const chapters = await Chapter.find({ moduleId });
        const chapterIds = chapters.map(c => c._id);

        await Promise.all([
            Lesson.deleteMany({ chapterId: { $in: chapterIds } }),
            Chapter.deleteMany({ moduleId }),
            Module.findByIdAndDelete(moduleId)
        ]);

        res.status(200).json({ success: true, message: "Module deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
