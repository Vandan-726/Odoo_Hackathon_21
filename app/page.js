'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
    { value: 'manager', label: 'Fleet Manager', desc: 'Full system access — vehicles, trips, drivers, analytics' },
    { value: 'dispatcher', label: 'Dispatcher', desc: 'Manage trips and coordinate drivers' },
    { value: 'safety_officer', label: 'Safety Officer', desc: 'Monitor maintenance, vehicles, and driver safety' },
    { value: 'analyst', label: 'Analyst', desc: 'Access analytics, reports, and expense data' },
];

function RoleIcon({ type, size = 20 }) {
    const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (type) {
        case 'manager':
            return (<svg viewBox="0 0 24 24" {...s}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" /></svg>);
        case 'dispatcher':
            return (<svg viewBox="0 0 24 24" {...s}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
        case 'safety_officer':
            return (<svg viewBox="0 0 24 24" {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
        case 'analyst':
            return (<svg viewBox="0 0 24 24" {...s}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
        default:
            return null;
    }
}

function FFLogo({ size = 84 }) {
    return (
        <svg viewBox="0 0 72 72" width={size} height={size}>
            <circle cx="36" cy="36" r="36" fill="#714b67" />
            <text x="36" y="44" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="26">FF</text>
        </svg>
    );
}

function LockIcon({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
    );
}

function UserPlusIcon({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
        </svg>
    );
}

function ArrowRightIcon({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function LoaderIcon({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
    );
}

function CheckIcon({ size = 16 }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoMorph, setLogoMorph] = useState(false);

    const handleRoleSelect = (r) => {
        setRole(r);
        setLogoMorph(true);
        setTimeout(() => setLogoMorph(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'login') {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error); setLoading(false); return; }
                localStorage.setItem('fleetflow_token', data.token);
                localStorage.setItem('fleetflow_user', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                if (!role) { setError('Please select a role'); setLoading(false); return; }
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error); setLoading(false); return; }
                // Don't auto-login — switch to login tab with success message
                setMode('login');
                setSuccess('Account created successfully! Please sign in.');
                setName('');
                setPassword('');
                setRole('');
                setLoading(false);
            }
        } catch {
            setError('Connection failed');
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        setSuccess('');
        setRole('');
    };

    return (
        <div className="login-page">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div className={`login-card ${mode === 'register' ? 'login-card-wide' : ''}`}>
                <div className="login-logo">
                    <div className={`login-logo-icon ${logoMorph ? 'logo-morph' : ''}`}>
                        {mode === 'login' || !role ? (
                            <FFLogo size={84} />
                        ) : (
                            <svg viewBox="0 0 72 72" width={84} height={84}>
                                <circle cx="36" cy="36" r="36" fill="#714b67" />
                                <g transform="translate(24, 24)" style={{ color: '#fff' }}>
                                    <RoleIcon type={role} size={24} />
                                </g>
                            </svg>
                        )}
                    </div>
                    <h1>FleetFlow</h1>
                    <p>Fleet &amp; Logistics Management System</p>
                </div>

                {/* Tab toggle */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => { setMode('login'); setError(''); setRole(''); }}
                    >
                        <LockIcon size={14} /> Sign In
                    </button>
                    <button
                        className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                    >
                        <UserPlusIcon size={14} /> Register
                    </button>
                </div>

                {success && (
                    <div style={{
                        background: 'rgba(22, 163, 74, 0.08)',
                        color: '#16a34a',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '.92rem',
                        marginBottom: '14px',
                        border: '1px solid rgba(22, 163, 74, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <CheckIcon size={16} /> {success}
                    </div>
                )}

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" className="form-input" placeholder="John Doe"
                                value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="form-input" placeholder="you@fleetflow.com"
                            value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" className="form-input"
                            placeholder={mode === 'register' ? 'Min. 6 characters' : 'Enter your password'}
                            value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Select Your Role</label>
                            <div className="role-selector">
                                {ROLES.map(r => (
                                    <label
                                        key={r.value}
                                        className={`role-option ${role === r.value ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={r.value}
                                            checked={role === r.value}
                                            onChange={() => handleRoleSelect(r.value)}
                                        />
                                        <span className="role-option-icon">
                                            <RoleIcon type={r.value} size={20} />
                                        </span>
                                        <span className="role-option-info">
                                            <span className="role-option-label">{r.label}</span>
                                            <span className="role-option-desc">{r.desc}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading
                            ? (<><LoaderIcon size={14} /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>)
                            : (<>{mode === 'login' ? <><LockIcon size={14} /> Sign In</> : <><ArrowRightIcon size={14} /> Create Account</>}</>)
                        }
                    </button>
                </form>

                <div className="login-footer">
                    {mode === 'login' ? (
                        <>
                            <span>Don&apos;t have an account? </span>
                            <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>Register here</a>
                            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Demo: manager@fleetflow.com / admin123
                            </div>
                        </>
                    ) : (
                        <>
                            <span>Already have an account? </span>
                            <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>Sign in</a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
