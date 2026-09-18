// ==========================================
// 🚀 NAYA: Vercel Serverless Entry Point
// ==========================================
// Vercel api/ folder ki har file ko serverless function banata hai.
// Ye file pura Express app (src/server.js) export karti hai — Vercel khud
// (req, res) ko Express pe bridge kar deta hai.
// NOTE: server.js me app.listen() sirf tab chalta hai jab VERCEL env set na ho.
import app from '../src/server.js';

export default app;