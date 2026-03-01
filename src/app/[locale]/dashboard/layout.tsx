import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

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

    // Example role fetching from cookies
    const userRole = cookieStore.get('userRole')?.value || 'User';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Premium Sidebar Component */}
            <aside className="glass" style={{ width: '260px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--primary)' }}>Tracker.</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '3rem', display: 'inline-block' }}>{userRole} Portal</span>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <a href={`/${locale}/dashboard`} style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: '1.05rem', transition: 'color 0.2s' }}>Overview</a>
                    {userRole === 'Admin' && (
                        <a href={`/${locale}/dashboard/admin`} style={{ color: 'var(--text-muted)', fontSize: '1.05rem', transition: 'color 0.2s' }}>Admin Panel</a>
                    )}
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '1.05rem', transition: 'color 0.2s' }}>Settings</a>
                </nav>

                {/* Logout area */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <LogoutButton locale={locale} />
                </div>
            </aside>

            {/* Main Dashboard Workspace */}
            <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ThemeToggle />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Locale: {locale.toUpperCase()}</span>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {userRole[0] || 'U'}
                        </div>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}
