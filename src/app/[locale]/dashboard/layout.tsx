import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { UserAvatarButton } from '@/components/UserAvatarButton';

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
    const isRtl = locale === 'ar';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', flexDirection: isRtl ? 'row' : 'row-reverse' }}>
            {/* Sidebar */}
            <aside className="glass" style={{ width: '260px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--primary)', textAlign: isRtl ? 'right' : 'left' }}>
                    {t('appName')}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '3rem', display: 'inline-block', textAlign: isRtl ? 'right' : 'left' }}>
                    {userRole} {t('userPortal')}
                </span>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: isRtl ? 'right' : 'left' }}>
                    <a href={`/${locale}/dashboard`} style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: '1.05rem', transition: 'color 0.2s' }}>
                        {t('overview')}
                    </a>
                    {userRole === 'Admin' && (
                        <a href={`/${locale}/dashboard/admin`} style={{ color: 'var(--text-muted)', fontSize: '1.05rem', transition: 'color 0.2s' }}>
                            {t('adminPanel')}
                        </a>
                    )}
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '1.05rem', transition: 'color 0.2s' }}>
                        {t('settings')}
                    </a>
                </nav>

                {/* Logout area */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem', textAlign: isRtl ? 'right' : 'left' }}>
                    <LogoutButton locale={locale} label={t('logout')} />
                </div>
            </aside>

            {/* Main Dashboard Workspace */}
            <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2rem', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <ThemeToggle />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {locale.toUpperCase()}
                        </span>
                        <UserAvatarButton locale={locale} userRole={userRole} />
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}
