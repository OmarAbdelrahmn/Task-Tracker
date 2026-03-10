import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LogoutButton } from '@/components/LogoutButton';
import { UserAvatarButton } from '@/components/UserAvatarButton';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarNav } from '@/components/SidebarNav';
import { Settings, User, ShieldCheck } from 'lucide-react';

const API_BASE_URL = 'https://taskmanager.premiumasp.net';

function extractRoleFromToken(token: string): string {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64').toString('utf-8').split('').map((c: string) =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        const payload = JSON.parse(jsonPayload);
        return payload.roles && payload.roles.length > 0 ? payload.roles[0] : 'User';
    } catch {
        return 'User';
    }
}

export default async function DashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const cookieStore = await cookies();
    let token = cookieStore.get('accessToken')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;

    // If accessToken is missing but refreshToken exists, try a server-side refresh
    if (!token && refreshToken) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: cookieStore.get('accessToken')?.value ?? '', refreshToken }),
                cache: 'no-store',
            });

            if (res.ok) {
                const data = await res.json();
                const newAccessToken = data.token;
                const newRefreshToken = data.refreshToken;

                if (newAccessToken) {
                    token = newAccessToken;
                    const role = extractRoleFromToken(newAccessToken);
                    const accessExpires = data.refreshTokenExpiration
                        ? new Date(data.refreshTokenExpiration).toUTCString()
                        : '';
                    const refreshExpires = data.refreshTokenExpiration
                        ? new Date(data.refreshTokenExpiration).toUTCString()
                        : '';

                    // Set cookies in the response headers via Next.js cookies() API
                    cookieStore.set('accessToken', newAccessToken, {
                        secure: true, sameSite: 'strict',
                        ...(accessExpires ? { expires: new Date(accessExpires) } : {})
                    });
                    cookieStore.set('userRole', role, { secure: true, sameSite: 'strict' });
                    if (newRefreshToken) {
                        cookieStore.set('refreshToken', newRefreshToken, {
                            secure: true, sameSite: 'strict',
                            ...(refreshExpires ? { expires: new Date(refreshExpires) } : {})
                        });
                    }
                }
            }
        } catch {
            // Refresh failed — will fall through to redirect below
        }
    }

    if (!token) {
        redirect(`/${locale}/login`);
    }

    const userRole = cookieStore.get('userRole')?.value || 'User';
    const t = await getTranslations('Dashboard');
    const tp = await getTranslations('Profile');
    const tm = await getTranslations('Tasks');
    const isRtl = locale === 'ar';

    const labels = {
        appName: t('appName'),
        userPortal: t('userPortal'),
        myTasks: tm('myTasks'),
        adminPanel: t('adminPanel'),
        settings: t('settings'),
        profile: tp('title'),
        logout: t('logout'),
        messages: t('messages'),
        reports: t('reports'),
    };

    const navItems = [
        { href: `/${locale}/dashboard/tasks`, label: tm('myTasks'), icon: 'tasks' },
        { href: `/${locale}/dashboard/messages`, label: t('messages'), icon: 'messages' },
        { href: `/${locale}/dashboard/reports`, label: t('reports'), icon: 'reports' },
        { href: `/${locale}/dashboard/profile`, label: tp('title'), icon: 'profile' },
        { href: `/${locale}/dashboard/settings`, label: t('settings'), icon: 'settings' },
        ...(userRole === 'Admin' ? [{ href: `/${locale}/dashboard/admin`, label: t('adminPanel'), icon: 'admin' }] : []),
    ];

    return (
        <div className={`dashboard-root${isRtl ? ' rtl' : ''}`}>
            {/* ── Desktop Sidebar (hidden on mobile) ── */}
            <aside className="glass desktop-sidebar">
                <div className="sidebar-brand-block" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <h2 className="sidebar-title" style={{ textAlign: 'center', margin: 0 }}>{t('appName')}</h2>
                </div>

                <SidebarNav locale={locale} userRole={userRole} labels={labels} />

                <div className="sidebar-logout">
                    <LogoutButton locale={locale} label={t('logout')} />
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    {/* Left side: avatar */}
                    <div className="header-right" style={{ marginLeft: 0, marginRight: 'auto' }}>
                        <UserAvatarButton locale={locale} userRole={userRole} />
                    </div>

                    {/* Hamburger — mobile only, pushed to the right */}
                    <MobileSidebar
                        locale={locale}
                        userRole={userRole}
                        labels={labels}
                        LogoutButtonComponent={<LogoutButton locale={locale} label={t('logout')} />}
                    />
                </header>

                <div className="dashboard-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
