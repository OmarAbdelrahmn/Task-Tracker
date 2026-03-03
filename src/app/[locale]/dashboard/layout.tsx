import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LogoutButton } from '@/components/LogoutButton';
import { UserAvatarButton } from '@/components/UserAvatarButton';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarNav } from '@/components/SidebarNav';
import { LayoutDashboard, Settings, User, ShieldCheck } from 'lucide-react';

export default async function DashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

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
        overview: t('overview'),
        myTasks: tm('myTasks'),
        adminPanel: t('adminPanel'),
        settings: t('settings'),
        profile: tp('title'),
        logout: t('logout'),
    };

    const navItems = [
        { href: `/${locale}/dashboard`, label: t('overview'), icon: 'overview' },
        { href: `/${locale}/dashboard/profile`, label: tp('title'), icon: 'profile' },
        { href: `/${locale}/dashboard/settings`, label: t('settings'), icon: 'settings' },
        ...(userRole === 'Admin' ? [{ href: `/${locale}/dashboard/admin`, label: t('adminPanel'), icon: 'admin' }] : []),
    ];

    return (
        <div className={`dashboard-root${isRtl ? ' rtl' : ''}`}>
            {/* ── Desktop Sidebar (hidden on mobile) ── */}
            <aside className="glass desktop-sidebar">
                <h2 className="sidebar-title">{t('appName')}</h2>
                <span className="sidebar-role">{userRole} {t('userPortal')}</span>

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
