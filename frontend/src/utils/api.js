import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL + '/api/v1',
    withCredentials: true // Ye zaroori hai taaki cookies (token) backend tak ja sakein
});

export default api;