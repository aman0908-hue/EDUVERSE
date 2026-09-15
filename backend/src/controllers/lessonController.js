import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import fs from 'fs';
import path from 'path';

// 1. Course aur Chapter ke andar naya Lesson (Video/URL/File) add karna
export const addLesson = async (req, res) => {
    try {
        const { title, courseId, chapterId, videoUrl, theoryContent, order } = req.body;

        if (!title || !courseId) {
            return res.status(400).json({ message: "Title and Course ID are required" });
        }

        // Yahan 'upload.fields' ke multiple files handle honge (Video aur Attachment dono)
        let attachmentFileName = '';
        let videoFileName = '';

        if (req.files) {
            if (req.files['attachmentFile'] && req.files['attachmentFile'].length > 0) {
                attachmentFileName = req.files['attachmentFile'][0].filename;
            }
            if (req.files['videoFile'] && req.files['videoFile'].length > 0) {
                videoFileName = req.files['videoFile'][0].filename;
            }
        } 
        // Fallback agar single file aayi ho
        else if (req.file) {
            attachmentFileName = req.file.filename;
        }

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        // Database mein lesson save karna
        const newLesson = await Lesson.create({
            title,
            courseId,
            chapterId: chapterId || null, // Chapter ID save karna
            videoUrl,
            videoFile: videoFileName,     // Video ka naam save karna
            theoryContent,
            attachment: attachmentFileName, // Notes/PDF ka naam save karna
            order: order || 1
        });

        res.status(201).json({
            success: true,
            message: "Lesson added successfully!",
            lesson: newLesson
        });
    } catch (error) {
        console.error("Lesson add error:", error);
        res.status(500).json({ success: false, message: "Error adding lesson: " + error.message });
    }
};

// 2. Kisi specific course ke saare lessons nikalna
export const getCourseLessons = async (req, res) => {
    try {
        const courseId = req.params.courseId || req.params.id; // handle both param names
        const lessons = await Lesson.find({ courseId }).sort({ order: 1 }); // Order ke hisaab se sort karenge

        res.status(200).json({ success: true, lessons });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching lessons" });
    }
};

// 3. 🚀 NAYA FEATURE: Advanced Chunked Video Streaming (HTTP Range 206)
export const streamVideo = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const lesson = await Lesson.findById(lectureId);

        if (!lesson || !lesson.videoFile) {
            return res.status(404).json({ success: false, message: "Video not found in database" });
        }

        // Uploads folder ka path (apne project structure ke hisaab se adjust karein)
        const videoPath = path.resolve('uploads', lesson.videoFile);

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ success: false, message: "Video file missing on server" });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Agar client ne range mangi hai (Chunked streaming)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            
            // Chunk size decide karna (e.g., 1MB chunks)
            const CHUNK_SIZE = 10 ** 6; // 1MB
            const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };

            // 206 Partial Content ka status dena
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Agar bina range ki request aayi (Direct play)
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error("Video streaming error:", error);
        res.status(500).json({ success: false, message: "Internal server error during video stream" });
    }
};

// ========================================================
// 🚀 NAYA FUNCTIONS (Requirement 5: Lectures full CRUD)
// ========================================================

// 4. Chapter ke saare lectures nikalna (GET /lectures/all/:chapterId)
export const getChapterLectures = async (req, res) => {
    try {
        const lectures = await Lesson.find({ chapterId: req.params.chapterId }).sort({ order: 1 });
        res.status(200).json({ success: true, lectures });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching chapter lectures" });
    }
};

// 5. Ek single lecture nikalna (GET /lectures/:lectureId)
export const getSingleLecture = async (req, res) => {
    try {
        const lecture = await Lesson.findById(req.params.lectureId);
        if (!lecture) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }
        res.status(200).json({ success: true, lecture });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching lecture" });
    }
};

// 6. Lecture update karna (PUT /lectures/:lectureId) — files optional
export const updateLesson = async (req, res) => {
    try {
        const lectureId = req.params.lectureId || req.body.lectureId;
        const updateFields = {};

        ['title', 'videoUrl', 'theoryContent', 'chapterId', 'order', 'courseId'].forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== '') updateFields[field] = req.body[field];
        });

        // Nayi files aayi hain toh replace karo
        if (req.files) {
            if (req.files['videoFile'] && req.files['videoFile'][0]) updateFields.videoFile = req.files['videoFile'][0].filename;
            if (req.files['attachmentFile'] && req.files['attachmentFile'][0]) updateFields.attachment = req.files['attachmentFile'][0].filename;
        }

        const updatedLesson = await Lesson.findByIdAndUpdate(lectureId, updateFields, { new: true });
        if (!updatedLesson) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }
        res.status(200).json({ success: true, message: "Lecture updated successfully!", lecture: updatedLesson });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating lecture: " + error.message });
    }
};

// 7. Lecture delete karna (DELETE /lectures/:lectureId)
export const deleteLesson = async (req, res) => {
    try {
        const lectureId = req.params.lectureId || req.body.lectureId;
        const deleted = await Lesson.findByIdAndDelete(lectureId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        // Progress se bhi completedLessons hata do
        await Progress.updateMany({ completedLessons: lectureId }, { $pull: { completedLessons: lectureId } });

        res.status(200).json({ success: true, message: "Lecture deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting lecture" });
    }
};

// 8. 🚀 NAYA: Lecture mein study material add karna (POST /lectures/materials)
export const addMaterials = async (req, res) => {
    try {
        const lectureId = req.body.lectureId || req.body.lessonId;
        const materialTitle = req.body.materialTitle || req.body.title || 'Study Material';

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please select a file to upload" });
        }
        if (!lectureId) {
            return res.status(400).json({ success: false, message: "lectureId is required" });
        }

        const updatedLesson = await Lesson.findByIdAndUpdate(
            lectureId,
            { $push: { materials: { title: materialTitle, file: req.file.filename } } },
            { new: true }
        );

        if (!updatedLesson) {
            return res.status(404).json({ success: false, message: "Lecture not found" });
        }

        res.status(200).json({
            success: true,
            message: "Study material added successfully!",
            material: { title: materialTitle, file: req.file.filename },
            lecture: updatedLesson
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding material: " + error.message });
    }
};