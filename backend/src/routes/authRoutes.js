import express from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { profileUpload } from '../utils/upload.js';

const router = express.Router();

// 🚀 Register mein ab profile image upload bhi ho sakti hai (field ka naam: 'profileImage')
router.post('/register', profileUpload.single('profileImage'), register);
router.post('/login', login);
router.post('/logout', logout);

// Session persistence (page reload par GET /auth/me)
router.get('/me', authMiddleware, getMe);

export default router;