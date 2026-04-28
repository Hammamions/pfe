import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // AJOUTEZ CECI POUR LE DEBUG
            console.error("Détails de l'erreur 401:", error.response.data);
            alert("Erreur 401 : " + (error.response.data.message || "Session expirée ou clé API invalide"));

            sessionStorage.removeItem('proToken');
            sessionStorage.removeItem('proUser');
            if (!window.location.pathname.includes('/login-pro')) {
                window.location.href = '/login-pro';
            }
        }
        return Promise.reject(error);
    }
);

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveDocumentOpenUrl(url) {
    if (!url || !String(url).trim()) return '';
    const s = String(url).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return `${API_ORIGIN}${s.startsWith('/') ? '' : '/'}${s}`;
}

export default api;
