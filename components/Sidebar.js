'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Command Center' },
    { href: '/vehicles', icon: '🚛', label: 'Vehicle Registry' },
    { href: '/trips', icon: '🗺️', label: 'Trip Dispatcher' },
    { href: '/maintenance', icon: '🔧', label: 'Maintenance Logs' },
    { href: '/expenses', icon: '💰', label: 'Expenses & Fuel' },
    { href: '/drivers', icon: '👤', label: 'Driver Profiles' },
    { href: '/analytics', icon: '📈', label: 'Analytics & Reports' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('fleetflow_user');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('fleetflow_token');
        localStorage.removeItem('fleetflow_user');
        router.push('/');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">🚀</div>
                <h2>FleetFlow</h2>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <a
                        key={item.href}
                        href={item.href}
                        className={pathname === item.href ? 'active' : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </a>
                ))}
            </nav>
            {user && (
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user.name?.charAt(0)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.name}</div>
                        <div className="sidebar-user-role">{user.role?.replace('_', ' ')}</div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Logout">
                        🚪
                    </button>
                </div>
            )}
        </aside>
    );
}
