import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
const baseURL = (rawUrl ? rawUrl : '') + '/api/v1';

const api = axios.create({
    baseURL,
    withCredentials: true // Ye zaroori hai taaki cookies (token) backend tak ja sakein
});

export default api;