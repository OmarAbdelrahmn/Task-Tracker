"use client";

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Monitor, Check, ArrowLeft, ArrowRight } from 'lucide-react';

const ACCENT_COLORS = [
    { key: 'blue', primary: '#3b82f6', secondary: '#8b5cf6' },
    { key: 'violet', primary: '#7c3aed', secondary: '#a78bfa' },
    { key: 'rose', primary: '#e11d48', secondary: '#fb7185' },
    { key: 'amber', primary: '#d97706', secondary: '#fbbf24' },
    { key: 'emerald', primary: '#059669', secondary: '#34d399' },
    { key: 'cyan', primary: '#0891b2', secondary: '#22d3ee' },
] as const;

type AccentKey = typeof ACCENT_COLORS[number]['key'];
const ACCENT_STORAGE_KEY = 'accentColor';

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations('Settings');
    const isRtl = locale === 'ar';
    const BackIcon = isRtl ? ArrowRight : ArrowLeft;
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [accent, setAccent] = useState<AccentKey>('blue');

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentKey | null;
        if (saved) applyAccent(saved, false);
    }, []);

    const applyAccent = (key: AccentKey, save = true) => {
        setAccent(key);
        document.documentElement.setAttribute('data-accent', key);
        if (save) localStorage.setItem(ACCENT_STORAGE_KEY, key);
    };

    const changeLocale = (newLocale: string) => {
        router.push(`/${newLocale}/dashboard/settings`);
    };

    const sectionTitle = (label: string) => (
        <h2 style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {label}
        </h2>
    );

    const themeOptions = [
        { value: 'light', icon: <Sun size={20} />, label: t('lightMode') },
        { value: 'dark', icon: <Moon size={20} />, label: t('darkMode') },
        { value: 'system', icon: <Monitor size={20} />, label: t('systemMode') },
    ];

    return (
        <div className="animate-fade-in" style={{ maxWidth: '540px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
            {/* Back link */}
            <a
                href={`/${locale}/dashboard`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
                <BackIcon size={16} />
                {useTranslations('Dashboard')('overview')}
            </a>

            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>{t('title')}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{t('subtitle')}</p>

            {/* ── Appearance ── */}
            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                {sectionTitle(t('appearance'))}

                {/* Light / Dark / System */}
                {mounted && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
                        {themeOptions.map(({ value, icon, label }) => {
                            const active = theme === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                        padding: '1rem 0.5rem', borderRadius: '10px', cursor: 'pointer',
                                        border: active ? '2px solid var(--primary)' : '2px solid var(--surface-border)',
                                        background: active ? 'rgba(var(--primary-rgb, 59,130,246), 0.08)' : 'var(--surface)',
                                        color: active ? 'var(--primary)' : 'var(--text-muted)',
                                        fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {icon}
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Accent colors */}
                {sectionTitle(t('accentColor'))}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {ACCENT_COLORS.map(({ key, primary, secondary }) => (
                        <button
                            key={key}
                            onClick={() => applyAccent(key)}
                            title={t(key as any)}
                            style={{
                                width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer', border: 'none',
                                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: accent === key ? `0 0 0 3px var(--background), 0 0 0 5px ${primary}` : 'none',
                                transform: accent === key ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {accent === key && <Check size={16} color="white" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Language ── */}
            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                {sectionTitle(t('language'))}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('languageSubtitle')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                        { code: 'en', label: t('english'), flag: 'EN' },
                        { code: 'ar', label: t('arabic'), flag: 'AR' },
                    ].map(({ code, label, flag }) => {
                        const active = locale === code;
                        return (
                            <button
                                key={code}
                                onClick={() => changeLocale(code)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '1rem 1.25rem', borderRadius: '10px', cursor: 'pointer',
                                    border: active ? '2px solid var(--primary)' : '2px solid var(--surface-border)',
                                    background: active ? 'rgba(var(--primary-rgb, 59,130,246), 0.08)' : 'var(--surface)',
                                    color: active ? 'var(--primary)' : 'var(--foreground)',
                                    fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: active ? 600 : 400,
                                    transition: 'all 0.2s',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{flag}</span>
                                    {label}
                                </span>
                                {active && <Check size={16} strokeWidth={3} />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
