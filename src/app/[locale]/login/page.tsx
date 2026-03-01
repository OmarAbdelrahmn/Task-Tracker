"use client";

import { useTranslations } from 'next-intl';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('Auth');
    const router = useRouter();

    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await AuthService.signIn(userName, password);
            // Wait for tokens to write, then redirect
            setTimeout(() => {
                window.location.href = `/${locale || 'en'}/dashboard`;
            }, 500);
        } catch (err: any) {
            setError(AuthService.extractErrorMessage(err));
            setLoading(false);
        }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Dynamic abstract background */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', position: 'relative', zIndex: 10, margin: '1rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>{t('loginTitle')}</h1>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>{t('loginSubtitle')}</p>

                {error && (
                    <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('userName')}</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="admin123"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
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

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', opacity: loading ? 0.7 : 1 }} disabled={loading}>
                        {loading ? '...' : t('loginSubmit')}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '1rem' }}>
                        {t('noAccount')} <a href="register" style={{ color: 'var(--primary)', fontWeight: 500 }}>{t('registerSubmit')}</a>
                    </p>
                    <a href="/en/login">EN</a> | <a href="/ar/login">عربي</a>
                </div>
            </div>
        </main>
    );
}
