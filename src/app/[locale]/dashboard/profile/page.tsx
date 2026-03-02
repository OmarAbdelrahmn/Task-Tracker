"use client";

import { useState, useRef, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { AuthService, UserProfile } from '@/services/auth.service';
import { API_BASE_URL } from '@/lib/api';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { Camera, ArrowLeft, ArrowRight, User, MapPin, AtSign, Lock, Eye, EyeOff, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';

// ── Profile cache ──
const PROFILE_CACHE_KEY = 'userProfile';

const getCachedProfile = (): UserProfile | null => {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
        return null;
    }
};

const setCachedProfile = (profile: UserProfile) => {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch { /* ignore */ }
};

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

    // ── Profile data ──
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // ── Avatar upload ──
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [avatarSuccess, setAvatarSuccess] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Edit info ──
    const [infoFullName, setInfoFullName] = useState('');
    const [infoAddress, setInfoAddress] = useState('');
    const [savingInfo, setSavingInfo] = useState(false);
    const [infoSuccess, setInfoSuccess] = useState(false);
    const [infoError, setInfoError] = useState<string | null>(null);

    // ── Change password ──
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    // ── Fetch profile on mount ──
    useEffect(() => {
        // Restore from cache instantly — no loading flash
        const cached = getCachedProfile();
        if (cached) {
            setProfile(cached);
            setInfoFullName(cached.fullName);
            setInfoAddress(cached.address);
            setLoadingProfile(false);
        }

        // Refresh from API in the background (silently)
        AuthService.getMe()
            .then((data) => {
                const resolved = { ...data, avatarUrl: resolveAvatar(data.avatarUrl) };
                setProfile(resolved);
                setInfoFullName(data.fullName);
                setInfoAddress(data.address);
                setCachedProfile(resolved);
                if (resolved.avatarUrl) {
                    Cookies.set('avatarUrl', resolved.avatarUrl, { secure: true, sameSite: 'strict' });
                }
            })
            .catch(() => {
                // If API fails and there was no cache, try the avatar cookie as a last resort
                if (!cached) {
                    const avatarCookie = Cookies.get('avatarUrl');
                    if (avatarCookie) setProfile({ userName: '', fullName: '', address: '', avatarUrl: avatarCookie });
                }
            })
            .finally(() => setLoadingProfile(false));
    }, []);

    // ── Handlers ──
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        setAvatarSuccess(false);
        setAvatarError(null);
    };

    const handleAvatarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);
        setAvatarError(null);
        setAvatarSuccess(false);
        try {
            const result = await AuthService.updateAvatar(selectedFile);
            console.log(result);
            const newUrl = resolveAvatar(result?.avatarUrl);
            if (newUrl) {
                Cookies.set('avatarUrl', newUrl, { secure: true, sameSite: 'strict' });
                setProfile((prev) => {
                    const updated = prev ? { ...prev, avatarUrl: newUrl } : prev;
                    if (updated) setCachedProfile(updated);
                    return updated;
                });
            }
            setAvatarSuccess(true);
            setPreview(null);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch {
            setAvatarError(t('errorMessage'));
        } finally {
            setUploading(false);
        }
    };

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingInfo(true);
        setInfoSuccess(false);
        setInfoError(null);
        try {
            await AuthService.updateInfo(infoFullName, infoAddress);
            setProfile((prev) => {
                const updated = prev ? { ...prev, fullName: infoFullName, address: infoAddress } : prev;
                if (updated) setCachedProfile(updated);
                return updated;
            });
            setInfoSuccess(true);
            setIsEditingInfo(false);
        } catch {
            setInfoError(t('infoError'));
        } finally {
            setSavingInfo(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangingPw(true);
        setPwSuccess(false);
        setPwError(null);
        try {
            await AuthService.changePassword(currentPassword, newPassword);
            setPwSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
        } catch {
            setPwError(t('passwordError'));
        } finally {
            setChangingPw(false);
        }
    };

    const displayAvatar = preview || profile?.avatarUrl;
    const userInitial = profile?.fullName?.[0] || profile?.userName?.[0] || 'U';

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px',
        background: 'var(--surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.12))',
        color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '0.95rem',
        outline: 'none', boxSizing: 'border-box',
    };

    const feedbackSuccess = (msg: string) => (
        <div style={{ padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '0.875rem', border: '1px solid rgba(34,197,94,0.25)', marginBottom: '0.75rem' }}>
            {msg}
        </div>
    );

    const feedbackError = (msg: string) => (
        <div style={{ padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '0.75rem' }}>
            {msg}
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ maxWidth: '540px', margin: '0 auto', width: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
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

            {/* ── Profile & Account Info card ── */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <User size={18} style={{ color: 'var(--primary)' }} />
                        {t('accountInfo')}
                    </h2>
                    <button
                        onClick={() => {
                            setIsEditingInfo(!isEditingInfo);
                            if (!isEditingInfo) {
                                setInfoFullName(profile?.fullName || '');
                                setInfoAddress(profile?.address || '');
                            }
                        }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500,
                            padding: '0.4rem', borderRadius: '4px', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 10%, transparent)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                        {isEditingInfo ? <X size={16} /> : <Pencil size={16} />}
                        {isEditingInfo ? t('backToDashboard') : t('editInfo')}
                    </button>
                </div>

                {/* Avatar Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div
                        style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '3px solid var(--primary)' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {loadingProfile ? (
                            <span style={{ fontSize: '1.2rem', color: 'white', opacity: 0.7 }}>…</span>
                        ) : displayAvatar ? (
                            <Image src={displayAvatar} alt="Avatar" width={100} height={100} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        ) : (
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{userInitial.toUpperCase()}</span>
                        )}
                        <div
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                            <Camera size={24} color="white" />
                        </div>
                    </div>

                    <div style={{ width: '100%', maxWidth: '300px' }}>
                        {avatarSuccess && feedbackSuccess(t('successMessage'))}
                        {avatarError && feedbackError(avatarError)}

                        <form onSubmit={handleAvatarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            {selectedFile && (
                                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}>
                                    {uploading ? t('uploading') : t('uploadButton')}
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Read-only username row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                        <AtSign size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('userName')}</p>
                            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{loadingProfile ? '…' : (profile?.userName || '—')}</p>
                        </div>
                    </div>

                    {infoSuccess && feedbackSuccess(t('infoSuccess'))}
                    {infoError && feedbackError(infoError)}

                    {!isEditingInfo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.02))', border: '1px solid var(--border, rgba(255,255,255,0.04))' }}>
                                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('fullName')}</p>
                                <p style={{ fontWeight: 500, fontSize: '1rem' }}>{loadingProfile ? '…' : (profile?.fullName || '—')}</p>
                            </div>
                            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--surface, rgba(255,255,255,0.02))', border: '1px solid var(--border, rgba(255,255,255,0.04))' }}>
                                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('address')}</p>
                                <p style={{ fontWeight: 500, fontSize: '1rem' }}>{loadingProfile ? '…' : (profile?.address || '—')}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} />{t('fullName')}</span>
                                </label>
                                <input style={inputStyle} value={infoFullName} onChange={(e) => setInfoFullName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} />{t('address')}</span>
                                </label>
                                <input style={inputStyle} value={infoAddress} onChange={(e) => setInfoAddress(e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={savingInfo} style={{ opacity: savingInfo ? 0.6 : 1 }}>
                                {savingInfo ? t('savingInfo') : t('saveInfo')}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* ── Change Password card ── */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Lock size={18} style={{ color: 'var(--primary)' }} />
                        {t('changePassword')}
                    </h2>
                    <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        {showPasswordForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                {showPasswordForm && (
                    <div style={{ marginTop: '1.5rem' }}>
                        {pwSuccess && feedbackSuccess(t('passwordSuccess'))}
                        {pwError && feedbackError(pwError)}

                        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Current password */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('currentPassword')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        style={{ ...inputStyle, paddingRight: isRtl ? undefined : '2.5rem', paddingLeft: isRtl ? '2.5rem' : undefined }}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                        style={{ position: 'absolute', top: '50%', [isRtl ? 'left' : 'right']: '10px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* New password */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('newPassword')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        style={{ ...inputStyle, paddingRight: isRtl ? undefined : '2.5rem', paddingLeft: isRtl ? '2.5rem' : undefined }}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        style={{ position: 'absolute', top: '50%', [isRtl ? 'left' : 'right']: '10px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={changingPw} style={{ opacity: changingPw ? 0.6 : 1 }}>
                                {changingPw ? t('changingPassword') : t('changePasswordButton')}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
