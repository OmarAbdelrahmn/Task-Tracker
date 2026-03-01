"use client";

import { AuthService } from '@/services/auth.service';

export function LogoutButton({ locale, label = 'Logout' }: { locale: string; label?: string }) {
    const handleLogout = async () => {
        // Ping the API to revoke the token, clears JS-Cookies inside
        await AuthService.logout();

        // Force an explicit window remount to clear Next Router cache seamlessly
        window.location.href = `/${locale}/login`;
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            style={{
                color: 'var(--danger)',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '1.05rem',
                fontWeight: 500
            }}>
            {label}
        </button>
    );
}
