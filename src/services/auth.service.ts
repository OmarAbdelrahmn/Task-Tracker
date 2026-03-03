import { api } from '@/lib/api';
import TokenManager from '@/lib/TokenManager';

export interface AuthResponse {
    id: string;
    userName: string;
    fullName: string;
    avatarUrl: string | null;
    token: string;
    expiresIn: number;
    refreshToken: string;
    refreshTokenExpiration: string;
}

export interface ApiErrorResponse {
    title?: string;
    status?: number;
    detail?: string;
    error?: {
        code: string;
        description: string;
    };
}

export interface UserProfile {
    userName: string;
    fullName: string;
    address: string;
    avatarUrl: string | null;
}

export class AuthService {
    static async getMe(): Promise<UserProfile> {
        const response = await api.get<UserProfile>('/api/me');
        return response.data;
    }

    static async updateInfo(fullName: string, address: string): Promise<void> {
        await api.put('/api/me/info', { fullName, address });
    }

    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        // Note: API body key is "newPassord" (API typo — kept intentionally)
        await api.put('/api/me/change-password', { currentPassword, newPassord: newPassword });
    }

    static async signIn(userName: string, password: string): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/api/Auth/signin', {
            userName,
            password
        });

        const data = response.data;
        if (data.token) {
            const role = typeof window !== 'undefined' ? TokenManager.extractRoleFromToken(data.token) : undefined;
            TokenManager.setTokens(data.token, data.refreshToken, role, data.expiresIn, data.refreshTokenExpiration);
        }
        return data;
    }

    static async register(userName: string, fullName: string, password: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>('/api/Auth/register', {
            userName,
            fullName,
            password
        });
        return response.data;
    }

    static async checkUsername(userName: string): Promise<{ isAvailable: boolean }> {
        const response = await api.get<{ isAvailable: boolean }>(`/api/me/check-username?userName=${encodeURIComponent(userName)}`);
        return response.data;
    }

    static async updateAvatar(file: File): Promise<{ avatarUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.put<{ avatarUrl: string }>('/api/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }

    static async logout(): Promise<void> {
        try {
            const token = TokenManager.getAccessToken();
            const refreshToken = TokenManager.getRefreshToken();

            if (token && refreshToken) {
                await api.post('/api/Auth/logout', {
                    token,
                    refreshToken
                });
            }
        } catch (e) {
            console.error('Logout API failure', e);
        } finally {
            TokenManager.clearTokens();
        }
    }

    static extractErrorMessage(error: any): string {
        if (error.response && error.response.data) {
            const data = error.response.data as ApiErrorResponse;
            if (data.error && data.error.description) {
                return data.error.description;
            }
            if (data.detail) {
                return data.detail;
            }
        }
        return error.message || 'An unexpected error occurred';
    }
}
