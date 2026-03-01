import axios from 'axios';
import TokenManager from './TokenManager';

export const API_BASE_URL = 'https://taskmanager.premiumasp.net/';

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

// Response interceptor to handle 401 & refresh token logic
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = TokenManager.getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token available');

                // Note: The specific refresh token URL/body depends on the API specification
                const response = await axios.post(`${API_BASE_URL}api/Auth/refresh`, {
                    refreshToken: refreshToken,
                    token: TokenManager.getAccessToken()
                });

                const newAccessToken = response.data.token;
                const newRefreshToken = response.data.refreshToken;
                const expiresIn = response.data.expiresIn;
                const refreshTokenExpiration = response.data.refreshTokenExpiration;

                if (newAccessToken) {
                    const role = typeof window !== 'undefined' ? TokenManager.extractRoleFromToken(newAccessToken) : undefined;
                    TokenManager.setTokens(newAccessToken, newRefreshToken, role, expiresIn, refreshTokenExpiration);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                TokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    // Relies on middleware to prepend locale
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
