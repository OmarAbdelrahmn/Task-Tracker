import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ROLE_KEY = 'userRole';

class TokenManager {
    static getAccessToken(): string | undefined {
        return Cookies.get(ACCESS_TOKEN_KEY);
    }

    static getRefreshToken(): string | undefined {
        return Cookies.get(REFRESH_TOKEN_KEY);
    }

    static getUserRole(): string | undefined {
        return Cookies.get(USER_ROLE_KEY);
    }

    static setTokens(accessToken: string, refreshToken?: string, role?: string, expiresIn?: number, refreshTokenExpiration?: string): void {
        const accessCookieOpts: Cookies.CookieAttributes = { secure: true, sameSite: 'strict' };
        if (expiresIn) {
            accessCookieOpts.expires = new Date(new Date().getTime() + expiresIn * 1000);
        }
        Cookies.set(ACCESS_TOKEN_KEY, accessToken, accessCookieOpts);

        if (refreshToken) {
            const refreshCookieOpts: Cookies.CookieAttributes = { secure: true, sameSite: 'strict' };
            if (refreshTokenExpiration) {
                refreshCookieOpts.expires = new Date(refreshTokenExpiration);
            }
            Cookies.set(REFRESH_TOKEN_KEY, refreshToken, refreshCookieOpts);
        }

        if (role) {
            Cookies.set(USER_ROLE_KEY, role, { secure: true, sameSite: 'strict' });
        }
    }

    static clearTokens(): void {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        Cookies.remove(USER_ROLE_KEY);
    }

    static hasValidToken(): boolean {
        return !!this.getAccessToken();
    }

    static extractRoleFromToken(token: string): string {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.roles && payload.roles.length > 0 ? payload.roles[0] : 'User';
        } catch (e) {
            return 'User';
        }
    }
}

export default TokenManager;
