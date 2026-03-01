"use client";

import { useState, useRef, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { AuthService, UserProfile } from '@/services/auth.service';
import { API_BASE_URL } from '@/lib/api';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { Camera, ArrowLeft, ArrowRight, User, MapPin, AtSign } from 'lucide-react';

// Prepend base URL for relative avatar paths returned by the API
const resolveAvatar = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
};

export default function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('Profile');
    const isRtl = locale === 'ar';
    const BackIcon = isRtl ? ArrowRight : ArrowLeft;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch profile on mount
    useEffect(() => {
        AuthService.getMe()
            .then((data) => {
                const resolved = { ...data, avatarUrl: resolveAvatar(data.avatarUrl) };
                setProfile(resolved);
                // Cache resolved avatarUrl in cookie for the header
                if (resolved.avatarUrl) {
                    Cookies.set('avatarUrl', resolved.avatarUrl, { secure: true, sameSite: 'strict' });
                }
            })
            .catch(() => {
                // fallback: read from cookie if API fails
                const cached = Cookies.get('avatarUrl');
                if (cached) setProfile({ userName: '', fullName: '', address: '', avatarUrl: cached });
            })
            .finally(() => setLoadingProfile(false));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        setSuccess(false);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await AuthService.updateAvatar(selectedFile);
            console.log(result);
            const newUrl = resolveAvatar(result?.avatarUrl);
            if (newUrl) {
                Cookies.set('avatarUrl', newUrl, { secure: true, sameSite: 'strict' });
                setProfile((prev) => prev ? { ...prev, avatarUrl: newUrl } : prev);
            }
            setSuccess(true);
            setPreview(null);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch {
            setError(t('errorMessage'));
        } finally {
            setUploading(false);
        }
    };

    const displayAvatar = preview || profile?.avatarUrl;
    const userInitial = profile?.fullName?.[0] || profile?.userName?.[0] || 'U';

    return (
        <div className="animate-fade-in" style={{ maxWidth: '540px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
            {/* Back Link */}
            <a
                href={`/${locale}/dashboard`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
                <BackIcon size={16} />
                {t('backToDashboard')}
            </a>

            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>{t('title')}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{t('subtitle')}</p>

            {/* ── Avatar card ── */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {/* Clickable avatar circle */}
                    <div
                        style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '3px solid var(--primary)' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {loadingProfile ? (
                            <span style={{ fontSize: '1.5rem', color: 'white', opacity: 0.7 }}>…</span>
                        ) : displayAvatar ? (
                            <Image src={displayAvatar} alt="Avatar" width={120} height={120} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        ) : (
                            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white' }}>{userInitial.toUpperCase()}</span>
                        )}
                        <div
                            className="avatar-overlay"
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                            <Camera size={28} color="white" />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('chooseImage')}</p>
                </div>

                {/* Feedback */}
                {success && (
                    <div style={{ padding: '0.75rem', marginTop: '1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '0.875rem', border: '1px solid rgba(34,197,94,0.25)', textAlign: 'center' }}>
                        {t('successMessage')}
                    </div>
                )}
                {error && (
                    <div style={{ padding: '0.75rem', marginTop: '1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* Upload form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('updateAvatar')}</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="input-field"
                            style={{ cursor: 'pointer', padding: '0.5rem' }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!selectedFile || uploading}
                        style={{ opacity: (!selectedFile || uploading) ? 0.6 : 1 }}
                    >
                        {uploading ? t('uploading') : t('uploadButton')}
                    </button>
                </form>
            </div>

            {/* ── Profile Info card ── */}
            <div className="glass-card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                    {t('accountInfo')}
                </h2>

                {loadingProfile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{ height: '48px', borderRadius: '8px', background: 'var(--surface)', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Username */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                            <AtSign size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('userName')}</p>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile?.userName || '—'}</p>
                            </div>
                        </div>

                        {/* Full Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                            <User size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('fullName')}</p>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile?.fullName || '—'}</p>
                            </div>
                        </div>

                        {/* Address */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                            <MapPin size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('address')}</p>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile?.address || '—'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
