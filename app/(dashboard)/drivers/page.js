'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import Modal from '@/components/Modal';

export default function DriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', license_number: '', license_category: 'Van', license_expiry: '', safety_score: 100 });

    const fetchDrivers = async () => {
        const res = await fetch('/api/drivers');
        setDrivers(await res.json());
    };

    useEffect(() => { fetchDrivers(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const method = editing ? 'PUT' : 'POST';
        const url = editing ? `/api/drivers/${editing.id}` : '/api/drivers';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        setEditing(null);
        fetchDrivers();
    };

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', email: '', phone: '', license_number: '', license_category: 'Van', license_expiry: '', safety_score: 100 });
        setError('');
        setShowModal(true);
    };

    const openEdit = (d) => {
        setEditing(d);
        setForm({ name: d.name, email: d.email, phone: d.phone, license_number: d.license_number, license_category: d.license_category, license_expiry: d.license_expiry, safety_score: d.safety_score });
        setError('');
        setShowModal(true);
    };

    const toggleStatus = async (d, newStatus) => {
        await fetch(`/api/drivers/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        fetchDrivers();
    };

    const getLicenseStatus = (expiry) => {
        const today = new Date();
        const exp = new Date(expiry);
        const daysLeft = Math.floor((exp - today) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) return { label: 'Expired', cls: 'expired' };
        if (daysLeft < 90) return { label: `${daysLeft}d left`, cls: 'expiring' };
        return { label: 'Valid', cls: 'valid' };
    };

    const getSafetyColor = (score) => {
        if (score >= 80) return 'var(--success)';
        if (score >= 60) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>👤 Driver Profiles & Safety</h1>
                <button className="btn btn-primary" onClick={openNew}>➕ Add Driver</button>
            </div>

            <div className="driver-grid">
                {drivers.map(d => {
                    const lic = getLicenseStatus(d.license_expiry);
                    return (
                        <div className="driver-card" key={d.id}>
                            <div className="driver-card-header">
                                <div className="driver-avatar">{d.name.charAt(0)}</div>
                                <div className="driver-meta">
                                    <div className="driver-name">{d.name}</div>
                                    <div className="driver-category">{d.license_category} License · {d.phone || 'No phone'}</div>
                                </div>
                                <StatusPill status={d.status} />
                            </div>

                            <div className="driver-stats">
                                <div>
                                    <div className="driver-stat-label">Safety Score</div>
                                    <div className="driver-stat-value">
                                        <div className="safety-score">
                                            <span style={{ color: getSafetyColor(d.safety_score) }}>{d.safety_score}</span>
                                            <div className="safety-bar">
                                                <div className="safety-bar-fill" style={{ width: `${d.safety_score}%`, background: getSafetyColor(d.safety_score) }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">License Status</div>
                                    <div className="driver-stat-value">
                                        <span className={`license-status ${lic.cls}`}>
                                            {lic.cls === 'valid' ? '✓' : lic.cls === 'expiring' ? '⚠' : '✕'} {lic.label}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">License #</div>
                                    <div className="driver-stat-value" style={{ fontSize: '0.85rem' }}>{d.license_number}</div>
                                </div>
                                <div>
                                    <div className="driver-stat-label">Expiry Date</div>
                                    <div className="driver-stat-value" style={{ fontSize: '0.85rem' }}>{d.license_expiry}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(d)}>✏️ Edit</button>
                                {d.status !== 'On Trip' && (
                                    <>
                                        {d.status !== 'On Duty' && <button className="btn btn-sm btn-success" onClick={() => toggleStatus(d, 'On Duty')}>On Duty</button>}
                                        {d.status !== 'Off Duty' && <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(d, 'Off Duty')}>Off Duty</button>}
                                        {d.status !== 'Suspended' && <button className="btn btn-sm btn-danger" onClick={() => toggleStatus(d, 'Suspended')}>Suspend</button>}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {drivers.length === 0 && <div className="table-empty">No drivers registered</div>}

            {showModal && (
                <Modal title={editing ? 'Edit Driver' : 'Add New Driver'} onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Alex Rivera" required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="alex@fleet.com" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-0101" />
                            </div>
                            <div className="form-group">
                                <label>License Number</label>
                                <input className="form-input" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} placeholder="DL-VAN-001" required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>License Category</label>
                                <select className="form-select" value={form.license_category} onChange={e => setForm({ ...form, license_category: e.target.value })}>
                                    <option value="Truck">Truck</option>
                                    <option value="Van">Van</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>License Expiry</label>
                                <input className="form-input" type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Safety Score (0-100)</label>
                            <input className="form-input" type="number" min="0" max="100" value={form.safety_score} onChange={e => setForm({ ...form, safety_score: Number(e.target.value) })} />
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'} Driver</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
