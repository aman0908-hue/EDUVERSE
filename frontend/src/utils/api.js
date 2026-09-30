import axios from 'axios';

const envUrl = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '')
    : '';

// Production build me API apne hi domain par serve hoti hai — root vercel.json
// "/api/(.*)" ko "/api" (serverless function) par rewrite karta hai. Isliye
// relative URL use karte hain. Warna purana/galat VITE_API_URL (jaise ek stale
// Vercel domain) bundle me bake ho jata hai aur saare requests us dead domain
// par ja kar fail ho jaate hain — jabki same-origin par API perfectly chalti hai.
const apiOrigin = import.meta.env.PROD ? '' : envUrl;

const baseURL = (apiOrigin ? apiOrigin : '') + '/api/v1';

// Absolute asset URLs (uploads, video stream) ke liye bhi same-origin logic.
export const assetUrl = path => {
    if (!path) return '';
    const clean = String(path).replace(/^\/+/, '');
    return `${apiOrigin}/uploads/${clean}`;
};

export { apiOrigin };

const api = axios.create({
    baseURL,
    withCredentials: true // Ye zaroori hai taaki cookies (token) backend tak ja sakein
});

export default api;