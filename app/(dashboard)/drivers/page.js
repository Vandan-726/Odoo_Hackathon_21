'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import Modal from '@/components/Modal';

export default function DriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', license_number: '', license_category: 'Van', license_expiry: '', safety_score: '100' });

    const fetchDrivers = async () => {
        const res = await fetch('/api/drivers');
        setDrivers(await res.json());
    };

    useEffect(() => { fetchDrivers(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, safety_score: Number(form.safety_score) }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        setForm({ name: '', email: '', phone: '', license_number: '', license_category: 'Van', license_expiry: '', safety_score: '100' });
        fetchDrivers();
    };

    const updateStatus = async (driver, newStatus) => {
        await fetch(`/api/drivers/${driver.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        fetchDrivers();
    };

    const deleteDriver = async (driver) => {
        if (!confirm(`Delete driver "${driver.name}"? This cannot be undone.`)) return;
        await fetch(`/api/drivers/${driver.id}`, { method: 'DELETE' });
        fetchDrivers();
    };

    const getLicenseStatus = (expiry) => {
        const today = new Date();
        const exp = new Date(expiry);
        const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) return { label: 'Expired', className: 'expired' };
        if (daysLeft < 30) return { label: `${daysLeft}d left`, className: 'expiring' };
        return { label: 'Valid', className: 'valid' };
    };

    const getStatusActions = (driver) => {
        const actions = [];
        if (driver.status !== 'On Trip') {
            if (driver.status !== 'On Duty') actions.push({ label: 'On Duty', status: 'On Duty' });
            if (driver.status !== 'Off Duty') actions.push({ label: 'Off Duty', status: 'Off Duty' });
            if (driver.status !== 'Suspended') actions.push({ label: 'Suspend', status: 'Suspended' });
            if (driver.status !== 'Retired') actions.push({ label: 'Retire', status: 'Retired' });
        }
        return actions;
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Driver Profiles</h1>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => { setError(''); setShowModal(true); }}>+ Add Driver</button>
                </div>
            </div>

            <div className="driver-grid">
                {drivers.map(driver => {
                    const lic = getLicenseStatus(driver.license_expiry);
                    const safetyColor = driver.safety_score >= 80 ? 'var(--green)' : driver.safety_score >= 50 ? 'var(--yellow)' : 'var(--red)';
                    const statusActions = getStatusActions(driver);

                    return (
                        <div className="driver-card" key={driver.id} style={driver.status === 'Retired' ? { opacity: 0.6 } : {}}>
                            <div className="driver-card-header">
                                <div className="driver-avatar">{driver.name?.charAt(0)}</div>
                                <div className="driver-meta">
                                    <div className="driver-name">{driver.name}</div>
                                    <div className="driver-category">{driver.license_category} License · {driver.license_number}</div>
                                </div>
                                <StatusPill status={driver.status} />
                            </div>
                            <div className="driver-stats">
                                <div>
                                    <div className="driver-stat-label">Safety Score</div>
                                    <div className="driver-stat-value">
                                        <div className="safety-score">
                                            <span>{driver.safety_score}</span>
                                            <div className="safety-bar">
                                                <div className="safety-bar-fill" style={{ width: `${driver.safety_score}%`, background: safetyColor }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">License Status</div>
                                    <div className="driver-stat-value">
                                        <span className={`license-status ${lic.className}`}>{lic.label}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">License Expiry</div>
                                    <div className="driver-stat-value" style={{ fontSize: '.85rem' }}>{driver.license_expiry}</div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">Actions</div>
                                    <div className="driver-stat-value" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {statusActions.map(a => (
                                            <button key={a.status} className="btn btn-sm btn-secondary" onClick={() => updateStatus(driver, a.status)}>
                                                {a.label}
                                            </button>
                                        ))}
                                        <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => deleteDriver(driver)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {drivers.length === 0 && <div className="table-empty">No drivers registered</div>}
            </div>

            {showModal && (
                <Modal title="Add New Driver" onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 14 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rajesh Kumar" required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91-98765-43210" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>License Number</label>
                                <input className="form-input" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} placeholder="DL-12345678" required />
                            </div>
                            <div className="form-group">
                                <label>License Category</label>
                                <select className="form-select" value={form.license_category} onChange={e => setForm({ ...form, license_category: e.target.value })}>
                                    <option value="Truck">Truck</option>
                                    <option value="Van">Van</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>License Expiry</label>
                                <input className="form-input" type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Safety Score (0-100)</label>
                                <input className="form-input" type="number" min="0" max="100" value={form.safety_score} onChange={e => setForm({ ...form, safety_score: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Add Driver</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
