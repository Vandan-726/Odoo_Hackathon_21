'use client';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content fade-in">
                {children}
            </main>
        </div>
    );
}
