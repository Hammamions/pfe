import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to add the token to every request
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('proToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor to handle unauthorized errors (token expired, etc.)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            sessionStorage.removeItem('proToken');
            sessionStorage.removeItem('proUser');
            // Optional: redirect to login if not already there
            if (!window.location.pathname.includes('/login-pro')) {
                window.location.href = '/login-pro';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
