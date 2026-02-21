'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filterVehicle, setFilterVehicle] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({ vehicle_id: '', trip_id: '', type: 'Fuel', liters: '', cost: '', expense_date: '', notes: '' });

    const fetchAll = async () => {
        const params = new URLSearchParams();
        if (filterVehicle) params.set('vehicle_id', filterVehicle);
        const [e, v, t] = await Promise.all([
            fetch(`/api/expenses?${params}`).then(r => r.json()),
            fetch('/api/vehicles').then(r => r.json()),
            fetch('/api/trips').then(r => r.json()),
        ]);
        setExpenses(e);
        setVehicles(v);
        setTrips(t);
    };

    useEffect(() => { fetchAll(); }, [filterVehicle]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, vehicle_id: Number(form.vehicle_id), trip_id: form.trip_id ? Number(form.trip_id) : null, liters: Number(form.liters), cost: Number(form.cost) }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        fetchAll();
    };

    // Calculate per-vehicle summary
    const vehicleSummary = {};
    expenses.forEach(e => {
        if (!vehicleSummary[e.vehicle_id]) vehicleSummary[e.vehicle_id] = { name: e.vehicle_name, plate: e.license_plate, fuel: 0, other: 0, liters: 0 };
        if (e.type === 'Fuel') { vehicleSummary[e.vehicle_id].fuel += e.cost; vehicleSummary[e.vehicle_id].liters += e.liters; }
        else vehicleSummary[e.vehicle_id].other += e.cost;
    });

    const totalFuel = expenses.filter(e => e.type === 'Fuel').reduce((s, e) => s + e.cost, 0);
    const totalOther = expenses.filter(e => e.type !== 'Fuel').reduce((s, e) => s + e.cost, 0);

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>💰 Expenses & Fuel Logging</h1>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ vehicle_id: '', trip_id: '', type: 'Fuel', liters: '', cost: '', expense_date: new Date().toISOString().split('T')[0], notes: '' }); setShowModal(true); }}>
                    ➕ Add Expense
                </button>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card">
                    <div className="kpi-card-icon yellow">⛽</div>
                    <div className="kpi-label">Total Fuel Cost</div>
                    <div className="kpi-value">₹{totalFuel.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon blue">🧾</div>
                    <div className="kpi-label">Other Expenses</div>
                    <div className="kpi-value">₹{totalOther.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon red">📊</div>
                    <div className="kpi-label">Total Operational Cost</div>
                    <div className="kpi-value">₹{(totalFuel + totalOther).toLocaleString()}</div>
                </div>
            </div>

            <div className="filter-bar">
                <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.license_plate}</option>)}
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Vehicle</th>
                            <th>Type</th>
                            <th>Liters</th>
                            <th>Cost</th>
                            <th>Date</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(exp => (
                            <tr key={exp.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>EXP-{String(exp.id).padStart(3, '0')}</td>
                                <td>{exp.vehicle_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({exp.license_plate})</span></td>
                                <td><span className={`status-pill ${exp.type === 'Fuel' ? 'on-trip' : 'draft'}`}>{exp.type}</span></td>
                                <td>{exp.liters > 0 ? `${exp.liters} L` : '—'}</td>
                                <td style={{ fontWeight: 600 }}>₹{exp.cost.toLocaleString()}</td>
                                <td>{exp.expense_date}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.notes || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {expenses.length === 0 && <div className="table-empty">No expenses recorded</div>}
            </div>

            {showModal && (
                <Modal title="Add Expense" onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Vehicle</label>
                                <select className="form-select" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} required>
                                    <option value="">Select vehicle...</option>
                                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.license_plate}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Linked Trip (Optional)</label>
                                <select className="form-select" value={form.trip_id} onChange={e => setForm({ ...form, trip_id: e.target.value })}>
                                    <option value="">None</option>
                                    {trips.map(t => <option key={t.id} value={t.id}>TRIP-{String(t.id).padStart(3, '0')} ({t.origin}→{t.destination})</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Type</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="Fuel">Fuel</option>
                                    <option value="Toll">Toll</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Liters (for fuel)</label>
                                <input className="form-input" type="number" step="0.1" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Cost (₹)</label>
                                <input className="form-input" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="5000" required />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input className="form-input" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." />
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Add Expense</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
