"use client";

import { useTranslations } from 'next-intl';
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('Auth');
    const router = useRouter();

    const [userName, setUserName] = useState('');
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const checkUsername = async () => {
            if (!userName || userName.trim().length === 0) {
                setIsUsernameAvailable(null);
                return;
            }

            setCheckingUsername(true);
            try {
                const res = await AuthService.checkUsername(userName);
                setIsUsernameAvailable(res.isAvailable);
            } catch (err) {
                setIsUsernameAvailable(null);
            } finally {
                setCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(() => {
            checkUsername();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [userName]);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const response = await AuthService.register(userName, fullName, password);
            setSuccess(response.message || t('registerSuccess'));
            setTimeout(() => {
                // Push to login matching the current locale route directly
                window.location.href = `/${locale || 'en'}/login`;
            }, 2000);
        } catch (err: any) {
            setError(AuthService.extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '10%', right: '-5%', width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(120px)', opacity: 0.15, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '5%', left: '-10%', width: '350px', height: '350px', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.15, borderRadius: '50%' }} />

            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', position: 'relative', zIndex: 10, margin: '1rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>{t('registerTitle')}</h1>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>{t('registerSubtitle')}</p>

                {error && (
                    <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '0.875rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('userName')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="user123"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                style={{
                                    borderColor: isUsernameAvailable === true ? 'var(--success, #10b981)' : isUsernameAvailable === false ? 'var(--danger, #ef4444)' : undefined,
                                    outlineColor: isUsernameAvailable === true ? 'var(--success, #10b981)' : isUsernameAvailable === false ? 'var(--danger, #ef4444)' : undefined,
                                }}
                                required
                            />
                            {checkingUsername && (
                                <span style={{ position: 'absolute', right: locale === 'ar' ? 'unset' : '10px', left: locale === 'ar' ? '10px' : 'unset', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    ...
                                </span>
                            )}
                        </div>
                        {isUsernameAvailable === false && (
                            <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                {t('usernameTaken') || 'Username is not available'}
                            </div>
                        )}
                        {isUsernameAvailable === true && (
                            <div style={{ color: 'var(--success, #10b981)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                {t('usernameAvailable') || 'Username is available'}
                            </div>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('fullName')}</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('password')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingRight: locale === 'ar' ? '1rem' : '40px', paddingLeft: locale === 'ar' ? '40px' : '1rem' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: locale === 'ar' ? 'unset' : '10px', left: locale === 'ar' ? '10px' : 'unset', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                title="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', opacity: loading || isUsernameAvailable === false ? 0.7 : 1 }} disabled={loading || isUsernameAvailable === false}>
                        {loading ? '...' : t('registerSubmit')}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '1rem' }}>
                        {t('haveAccount')} <a href="login" style={{ color: 'var(--primary)', fontWeight: 500 }}>{t('loginSubmit')}</a>
                    </p>
                    <a href="/en/register">EN</a> | <a href="/ar/register">عربي</a>
                </div>
            </div>
        </main>
    );
}
