'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import Modal from '@/components/Modal';

export default function MaintenancePage() {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ vehicle_id: '', service_type: '', description: '', cost: '', service_date: '' });

    const fetchAll = async () => {
        const [l, v] = await Promise.all([
            fetch('/api/maintenance').then(r => r.json()),
            fetch('/api/vehicles').then(r => r.json()),
        ]);
        setLogs(l);
        setVehicles(v);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, vehicle_id: Number(form.vehicle_id), cost: Number(form.cost) }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        fetchAll();
    };

    const completeMaintenance = async (log) => {
        await fetch(`/api/maintenance/${log.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Completed' }),
        });
        fetchAll();
    };

    const serviceTypes = ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Overhaul', 'Battery Replacement', 'Transmission Service', 'AC Repair', 'General Inspection', 'Other'];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🔧 Maintenance & Service Logs</h1>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ vehicle_id: '', service_type: '', description: '', cost: '', service_date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}>
                    ➕ Add Service Log
                </button>
            </div>

            <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--warning)' }}>
                ⚡ Adding a service log automatically sets the vehicle status to "In Shop" — it will be hidden from the Trip Dispatcher.
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Vehicle</th>
                            <th>Service Type</th>
                            <th>Description</th>
                            <th>Cost</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>SVC-{String(log.id).padStart(3, '0')}</td>
                                <td>{log.vehicle_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({log.license_plate})</span></td>
                                <td>{log.service_type}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</td>
                                <td>₹{(log.cost || 0).toLocaleString()}</td>
                                <td>{log.service_date}</td>
                                <td><StatusPill status={log.status} /></td>
                                <td>
                                    {log.status !== 'Completed' && (
                                        <button className="btn btn-sm btn-success" onClick={() => completeMaintenance(log)}>✅ Complete</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && <div className="table-empty">No maintenance logs</div>}
            </div>

            {showModal && (
                <Modal title="Add Service Log" onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Vehicle</label>
                            <select className="form-select" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} required>
                                <option value="">Select vehicle...</option>
                                {vehicles.filter(v => v.status !== 'Retired').map(v => (
                                    <option key={v.id} value={v.id}>{v.name} — {v.license_plate} ({v.status})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Service Type</label>
                                <select className="form-select" value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} required>
                                    <option value="">Select type...</option>
                                    {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cost (₹)</label>
                                <input className="form-input" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="2500" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Service Date</label>
                            <input className="form-input" type="date" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about the service..." />
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Add Log</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
