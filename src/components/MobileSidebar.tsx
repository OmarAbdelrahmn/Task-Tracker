"use client";

import { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, Settings, User, ShieldCheck } from 'lucide-react';

interface MobileSidebarProps {
    locale: string;
    userRole: string;
    labels: {
        appName: string;
        userPortal: string;
        overview: string;
        myTasks: string;
        adminPanel: string;
        settings: string;
        profile: string;
        logout: string;
    };
    LogoutButtonComponent: React.ReactNode;
}

export function MobileSidebar({ locale, userRole, labels, LogoutButtonComponent }: MobileSidebarProps) {
    const [open, setOpen] = useState(false);
    const isRtl = locale === 'ar';

    useEffect(() => {
        const close = () => setOpen(false);
        window.addEventListener('resize', close);
        return () => window.removeEventListener('resize', close);
    }, []);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const navItems = [
        { href: `/${locale}/dashboard`, label: labels.overview, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/dashboard/tasks`, label: labels.myTasks, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/dashboard/profile`, label: labels.profile, icon: <User size={18} /> },
        { href: `/${locale}/dashboard/settings`, label: labels.settings, icon: <Settings size={18} /> },
        ...(userRole === 'Admin' ? [{ href: `/${locale}/dashboard/admin`, label: labels.adminPanel, icon: <ShieldCheck size={18} /> }] : []),
    ];

    return (
        <>
            {/* Hamburger button — mobile only */}
            <button
                className="mobile-menu-btn"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    flexShrink: 0,
                }}
            >
                <Menu size={22} />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 998,
                        backdropFilter: 'blur(2px)',
                        animation: 'fadeIn 0.2s ease',
                    }}
                />
            )}

            {/* Drawer */}
            <aside
                className="glass"
                style={{
                    position: 'fixed',
                    top: 0,
                    [isRtl ? 'right' : 'left']: 0,
                    width: '280px',
                    height: '100dvh',
                    padding: '2rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 999,
                    transform: open ? 'translateX(0)' : isRtl ? 'translateX(100%)' : 'translateX(-100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                    overflowY: 'auto',
                }}
            >
                {/* Drawer header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {labels.appName}
                        </h2>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {userRole} {labels.userPortal}
                        </span>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', display: 'flex', padding: '0.25rem',
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Nav links */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {navItems.map(({ href, label, icon }) => (
                        <a
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                flexDirection: isRtl ? 'row-reverse' : 'row',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                textAlign: isRtl ? 'right' : 'left',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 10%, transparent)';
                                e.currentTarget.style.color = 'var(--primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-muted)';
                            }}
                        >
                            {icon}
                            {label}
                        </a>
                    ))}
                </nav>

                {/* Logout area */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem', textAlign: isRtl ? 'right' : 'left' }}>
                    {LogoutButtonComponent}
                </div>
            </aside>
        </>
    );
}
