"use client";

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, User, ShieldCheck } from 'lucide-react';

interface SidebarNavProps {
    locale: string;
    userRole: string;
    labels: {
        overview: string;
        profile: string;
        settings: string;
        adminPanel: string;
    };
}

export function SidebarNav({ locale, userRole, labels }: SidebarNavProps) {
    const pathname = usePathname();

    const navItems = [
        { href: `/${locale}/dashboard`, label: labels.overview, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/dashboard/profile`, label: labels.profile, icon: <User size={18} /> },
        { href: `/${locale}/dashboard/settings`, label: labels.settings, icon: <Settings size={18} /> },
        ...(userRole === 'Admin'
            ? [{ href: `/${locale}/dashboard/admin`, label: labels.adminPanel, icon: <ShieldCheck size={18} /> }]
            : []),
    ];

    const isActive = (href: string) => {
        // Exact match for dashboard root, prefix match for sub-pages
        if (href === `/${locale}/dashboard`) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <nav className="sidebar-nav">
            {navItems.map(({ href, label, icon }) => (
                <a
                    key={href}
                    href={href}
                    className={`sidebar-link sidebar-link--icon${isActive(href) ? ' active' : ''}`}
                >
                    {icon}
                    {label}
                </a>
            ))}
        </nav>
    );
}
