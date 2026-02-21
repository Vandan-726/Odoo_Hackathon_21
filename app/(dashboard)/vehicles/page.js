'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import Modal from '@/components/Modal';

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', model: '', license_plate: '', type: 'Van', max_capacity_kg: '', odometer: '', region: 'Default', acquisition_cost: '' });

    const fetchVehicles = async () => {
        const params = new URLSearchParams();
        if (filterType) params.set('type', filterType);
        if (filterStatus) params.set('status', filterStatus);
        const res = await fetch(`/api/vehicles?${params}`);
        setVehicles(await res.json());
    };

    useEffect(() => { fetchVehicles(); }, [filterType, filterStatus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const method = editing ? 'PUT' : 'POST';
        const url = editing ? `/api/vehicles/${editing.id}` : '/api/vehicles';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        setEditing(null);
        fetchVehicles();
    };

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', model: '', license_plate: '', type: 'Van', max_capacity_kg: '', odometer: '', region: 'Default', acquisition_cost: '' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (v) => {
        setEditing(v);
        setForm({ name: v.name, model: v.model, license_plate: v.license_plate, type: v.type, max_capacity_kg: v.max_capacity_kg, odometer: v.odometer, region: v.region, acquisition_cost: v.acquisition_cost });
        setError('');
        setShowModal(true);
    };

    const toggleRetire = async (v) => {
        const newStatus = v.status === 'Retired' ? 'Available' : 'Retired';
        await fetch(`/api/vehicles/${v.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        fetchVehicles();
    };

    const handleDelete = async (v) => {
        if (!confirm(`Delete vehicle ${v.name}?`)) return;
        await fetch(`/api/vehicles/${v.id}`, { method: 'DELETE' });
        fetchVehicles();
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🚛 Vehicle Registry</h1>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={openNew}>➕ Add Vehicle</button>
                </div>
            </div>

            <div className="filter-bar">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Bike">Bike</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle</th>
                            <th>License Plate</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Odometer</th>
                            <th>Region</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(v => (
                            <tr key={v.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{v.model}</span></td>
                                <td className="font-mono">{v.license_plate}</td>
                                <td>{v.type}</td>
                                <td>{v.max_capacity_kg.toLocaleString()} kg</td>
                                <td>{v.odometer.toLocaleString()} km</td>
                                <td>{v.region}</td>
                                <td><StatusPill status={v.status} /></td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-icon" onClick={() => openEdit(v)} title="Edit">✏️</button>
                                        <button className="btn-icon" onClick={() => toggleRetire(v)} title={v.status === 'Retired' ? 'Reactivate' : 'Retire'}>
                                            {v.status === 'Retired' ? '♻️' : '🚫'}
                                        </button>
                                        <button className="btn-icon" onClick={() => handleDelete(v)} title="Delete">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {vehicles.length === 0 && <div className="table-empty">No vehicles found</div>}
            </div>

            {showModal && (
                <Modal title={editing ? 'Edit Vehicle' : 'Add New Vehicle'} onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Vehicle Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Van-05" required />
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input className="form-input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g. Ford Transit" required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>License Plate</label>
                                <input className="form-input" value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} placeholder="e.g. VAN-2001" required />
                            </div>
                            <div className="form-group">
                                <label>Vehicle Type</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="Truck">Truck</option>
                                    <option value="Van">Van</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Max Capacity (kg)</label>
                                <input className="form-input" type="number" value={form.max_capacity_kg} onChange={e => setForm({ ...form, max_capacity_kg: Number(e.target.value) })} placeholder="500" />
                            </div>
                            <div className="form-group">
                                <label>Odometer (km)</label>
                                <input className="form-input" type="number" value={form.odometer} onChange={e => setForm({ ...form, odometer: Number(e.target.value) })} placeholder="0" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Region</label>
                                <input className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="North" />
                            </div>
                            <div className="form-group">
                                <label>Acquisition Cost (₹)</label>
                                <input className="form-input" type="number" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: Number(e.target.value) })} placeholder="0" />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'} Vehicle</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
