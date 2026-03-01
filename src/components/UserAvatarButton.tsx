"use client";

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import Cookies from 'js-cookie';
import Image from 'next/image';

const resolveAvatar = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
};

interface UserAvatarButtonProps {
    locale: string;
    userRole: string;
}

export function UserAvatarButton({ locale, userRole }: UserAvatarButtonProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = Cookies.get('avatarUrl');
        if (url) setAvatarUrl(resolveAvatar(url));
    }, []);

    return (
        <a
            href={`/${locale}/dashboard/profile`}
            title="My Profile"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer',
                textDecoration: 'none',
                flexShrink: 0,
                border: '2px solid transparent',
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb, 99,102,241), 0.2)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'transparent';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
            }}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt="User Avatar"
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    unoptimized
                />
            ) : (
                <span>{userRole?.[0]?.toUpperCase() || 'U'}</span>
            )}
        </a>
    );
}
