import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

export default async function DashboardOverview() {
    const t = await getTranslations('Login'); // We can make a separate Dashboard dict later
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value || 'User';

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Welcome to the main overview. You are logged in as a <strong>{userRole}</strong>.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Tasks</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>24</p>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Completed Forms</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>128</p>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, opacity: 0.9, marginBottom: '0.5rem' }}>Pending actions</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>3</p>
                </div>
            </div>
        </div>
    );
}
