import multer from 'multer';
import fs from 'fs';
import path from 'path';

// ============================================
// 🚀 CENTRALIZED MULTER UPLOAD CONFIG
// Saare file uploads yahi se manage honge
// ============================================

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Common disk storage: file uploads/ folder mein unique naam se save hogi
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});

// --- FILE FILTERS ---
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
};

const videoFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed!'));
};

// Images + Videos dono (Course thumbnail + trailer ke liye)
// 🚀 Extension fallback bhi hai (kuch clients octet-stream bhejte hain)
const mediaFilter = (req, file, cb) => {
    const isMedia = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'];
    if (isMedia || mediaExtensions.includes(ext)) return cb(null, true);
    cb(new Error('Only image or video files are allowed!'));
};

// PDFs, images, zip aur code/text files (study materials ke liye)
const materialFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf', 'image/', 'application/zip', 'application/x-zip-compressed',
        'text/plain', 'application/json', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.html', '.css', '.json', '.txt', '.md', '.sql', '.ipynb'];
    const isAllowed = allowed.some(type => file.mimetype.startsWith(type)) ||
        codeExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
    if (isAllowed) return cb(null, true);
    cb(new Error('This file type is not allowed as study material!'));
};

// --- EXPORTED UPLOAD HANDLERS ---

// 1. Register ke time profile image
export const profileUpload = multer({
    storage: diskStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 2. Course create/update ke time thumbnail + trailer video
export const courseUpload = multer({
    storage: diskStorage,
    fileFilter: mediaFilter,
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB (video)
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'trailerVideo', maxCount: 1 }
]);

// 3. Lecture ke time video + attachment
export const lessonUpload = multer({
    storage: diskStorage,
    limits: { fileSize: 200 * 1024 * 1024 }
}).fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'attachmentFile', maxCount: 1 }
]);

// 4. Lecture mein extra study material add karne ke liye
export const materialUpload = multer({
    storage: diskStorage,
    fileFilter: materialFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).single('materialFile');

export default diskStorage;