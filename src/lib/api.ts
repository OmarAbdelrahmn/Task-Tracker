import axios from 'axios';
import TokenManager from './TokenManager';

export const API_BASE_URL = 'https://taskmanager.premiumasp.net';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to append JWT token
api.interceptors.request.use((config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null) => {
    refreshQueue.forEach((cb) => cb(token || ''));
    refreshQueue = [];
};

// Response interceptor to handle 401 & refresh token logic
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest || originalRequest.url?.includes('/api/Auth/signin') || originalRequest.url?.includes('/api/Auth/register')) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    refreshQueue.push((token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = TokenManager.getRefreshToken();
                const accessToken = TokenManager.getAccessToken();
                if (!refreshToken) throw new Error('No refresh token available');

                const response = await axios.post(`${API_BASE_URL}/api/Auth/refresh`, {
                    refreshToken: refreshToken,
                    token: accessToken
                });

                const newAccessToken = response.data.token;
                const newRefreshToken = response.data.refreshToken;
                const expiresIn = response.data.expiresIn;
                const refreshTokenExpiration = response.data.refreshTokenExpiration;

                if (newAccessToken) {
                    const role = typeof window !== 'undefined' ? TokenManager.extractRoleFromToken(newAccessToken) : undefined;
                    TokenManager.setTokens(newAccessToken, newRefreshToken, role, expiresIn, refreshTokenExpiration);

                    isRefreshing = false;
                    processQueue(newAccessToken);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(null);
                TokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

