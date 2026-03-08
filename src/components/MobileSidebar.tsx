"use client";

import { useState, useEffect } from 'react';
import { Menu, X, Settings, User, ShieldCheck, MessageSquare, ListTodo } from 'lucide-react';

interface MobileSidebarProps {
    locale: string;
    userRole: string;
    labels: {
        appName: string;
        userPortal: string;
        myTasks: string;
        adminPanel: string;
        settings: string;
        messages: string;
        reports: string;
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
        { href: `/${locale}/dashboard/tasks`, label: labels.myTasks, icon: <ListTodo size={18} /> },
        { href: `/${locale}/dashboard/messages`, label: labels.messages, icon: <MessageSquare size={18} /> },
        { href: `/${locale}/dashboard/reports`, label: labels.reports, icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg> },
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem', position: 'relative' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', margin: 0 }}>
                        {labels.appName}
                    </h2>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', display: 'flex', padding: '0.25rem',
                            position: 'absolute', [isRtl ? 'left' : 'right']: 0,
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
