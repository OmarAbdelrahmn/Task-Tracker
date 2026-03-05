"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, User, ShieldCheck, ListTodo, MessageSquare } from 'lucide-react';
import { ConversationService } from '@/services/conversation.service';
import { useSignalR } from '@/lib/useSignalR';
import TokenManager from '@/lib/TokenManager';

interface SidebarNavProps {
    locale: string;
    userRole: string;
    labels: {
        overview: string;
        myTasks: string;
        profile: string;
        messages: string;
        settings: string;
        adminPanel: string;
    };
}

export function SidebarNav({ locale, userRole, labels }: SidebarNavProps) {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    const isMessagePath = pathname.includes(`/${locale}/dashboard/messages`);

    // Extract current user to avoid self-incrementing
    const token = TokenManager.getAccessToken();
    let currentUserIdStr = '';
    try {
        if (token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            currentUserIdStr = JSON.parse(jsonPayload).nameid || '';
        }
    } catch (e) { }

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await ConversationService.getUnreadCount();
                setUnreadCount(res.totalUnread);
            } catch (e) {
                console.error("Failed to load unread count", e);
            }
        };
        fetchUnread();
    }, [pathname]); // Refresh when navigating as a backup

    useSignalR(null, {
        onReceiveMessage: (msg) => {
            // Only increment if we are not currently active in messages, or if the message is from someone else
            if (msg.senderId !== currentUserIdStr && !isMessagePath) {
                setUnreadCount(prev => prev + 1);
            }
        }
    });

    const navItems = [
        { href: `/${locale}/dashboard`, label: labels.overview, icon: <LayoutDashboard size={18} /> },
        { href: `/${locale}/dashboard/tasks`, label: labels.myTasks, icon: <ListTodo size={18} /> },
        { href: `/${locale}/dashboard/messages`, label: labels.messages, icon: <MessageSquare size={18} /> },
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
            {navItems.map(({ href, label, icon }) => {
                const isMessagesLink = href === `/${locale}/dashboard/messages`;
                return (
                    <a
                        key={href}
                        href={href}
                        className={`sidebar-link sidebar-link--icon${isActive(href) ? ' active' : ''}`}
                    >
                        <div style={{ position: 'relative', display: 'flex' }}>
                            {icon}
                            {isMessagesLink && unreadCount > 0 && (
                                <div style={{
                                    position: 'absolute', top: -4, right: -4,
                                    background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 700,
                                    minWidth: '16px', height: '16px', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                                }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </div>
                            )}
                        </div>
                        {label}
                    </a>
                );
            })}
        </nav>
    );
}
