'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';
import Modal from '@/components/Modal';

export default function TripsPage() {
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [statusModal, setStatusModal] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [error, setError] = useState('');
    const [endOdometer, setEndOdometer] = useState('');
    const [endRevenue, setEndRevenue] = useState('');
    const [form, setForm] = useState({ vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight_kg: '', cargo_description: '', revenue: '' });

    const fetchAll = async () => {
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        const [t, v, d] = await Promise.all([
            fetch(`/api/trips?${params}`).then(r => r.json()),
            fetch('/api/vehicles?status=Available').then(r => r.json()),
            fetch('/api/drivers').then(r => r.json()),
        ]);
        setTrips(t);
        setVehicles(v);
        setDrivers(d.filter(dr => dr.status !== 'On Trip' && dr.status !== 'Suspended'));
    };

    useEffect(() => { fetchAll(); }, [filterStatus]);

    const selectedVehicle = vehicles.find(v => v.id === Number(form.vehicle_id));
    const capacityWarning = selectedVehicle && form.cargo_weight_kg && Number(form.cargo_weight_kg) > selectedVehicle.max_capacity_kg;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, vehicle_id: Number(form.vehicle_id), driver_id: Number(form.driver_id), cargo_weight_kg: Number(form.cargo_weight_kg), revenue: Number(form.revenue) }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
        setShowModal(false);
        fetchAll();
    };

    const updateStatus = async (trip, newStatus) => {
        const body = { status: newStatus };
        if (newStatus === 'Completed') {
            body.end_odometer = Number(endOdometer) || trip.start_odometer;
            body.revenue = Number(endRevenue) || trip.revenue;
        }
        await fetch(`/api/trips/${trip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setStatusModal(null);
        setEndOdometer('');
        setEndRevenue('');
        fetchAll();
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🗺️ Trip Dispatcher</h1>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => { setError(''); setForm({ vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight_kg: '', cargo_description: '', revenue: '' }); setShowModal(true); }}>
                        ➕ Create Trip
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Trip ID</th>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>Route</th>
                            <th>Cargo</th>
                            <th>Revenue</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.map(trip => (
                            <tr key={trip.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>TRIP-{String(trip.id).padStart(3, '0')}</td>
                                <td>{trip.vehicle_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({trip.license_plate})</span></td>
                                <td>{trip.driver_name}</td>
                                <td>{trip.origin} → {trip.destination}</td>
                                <td>{trip.cargo_weight_kg} kg</td>
                                <td>₹{(trip.revenue || 0).toLocaleString()}</td>
                                <td><StatusPill status={trip.status} /></td>
                                <td>
                                    <div className="action-btns">
                                        {trip.status === 'Draft' && (
                                            <button className="btn btn-sm btn-primary" onClick={() => updateStatus(trip, 'Dispatched')}>🚀 Dispatch</button>
                                        )}
                                        {trip.status === 'Dispatched' && (
                                            <button className="btn btn-sm btn-success" onClick={() => { setStatusModal(trip); setEndOdometer(''); setEndRevenue(trip.revenue); }}>✅ Complete</button>
                                        )}
                                        {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
                                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(trip, 'Cancelled')}>✕</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {trips.length === 0 && <div className="table-empty">No trips found</div>}
            </div>

            {showModal && (
                <Modal title="Create New Trip" onClose={() => setShowModal(false)}>
                    {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Vehicle (Available)</label>
                                <select className="form-select" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} required>
                                    <option value="">Select vehicle...</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} — {v.license_plate} ({v.max_capacity_kg}kg max)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Driver (Available)</label>
                                <select className="form-select" value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} required>
                                    <option value="">Select driver...</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} — {d.license_category} license</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Origin</label>
                                <input className="form-input" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Mumbai" required />
                            </div>
                            <div className="form-group">
                                <label>Destination</label>
                                <input className="form-input" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Delhi" required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Cargo Weight (kg)</label>
                                <input className="form-input" type="number" value={form.cargo_weight_kg} onChange={e => setForm({ ...form, cargo_weight_kg: e.target.value })} placeholder="450" />
                                {capacityWarning && (
                                    <div className="form-error">⚠️ Exceeds max capacity of {selectedVehicle.max_capacity_kg}kg!</div>
                                )}
                                {selectedVehicle && !capacityWarning && form.cargo_weight_kg && (
                                    <div className="form-hint" style={{ color: 'var(--success)' }}>✓ Within capacity ({form.cargo_weight_kg}/{selectedVehicle.max_capacity_kg}kg)</div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Revenue (₹)</label>
                                <input className="form-input" type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="10000" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Cargo Description</label>
                            <textarea className="form-textarea" value={form.cargo_description} onChange={e => setForm({ ...form, cargo_description: e.target.value })} placeholder="Describe the cargo..." />
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Create Trip</button>
                        </div>
                    </form>
                </Modal>
            )}

            {statusModal && (
                <Modal title="Complete Trip" onClose={() => setStatusModal(null)}>
                    <div className="form-group">
                        <label>Final Odometer Reading (km)</label>
                        <input className="form-input" type="number" value={endOdometer} onChange={e => setEndOdometer(e.target.value)} placeholder={statusModal.start_odometer} />
                        <div className="form-hint">Start odometer: {statusModal.start_odometer?.toLocaleString()} km</div>
                    </div>
                    <div className="form-group">
                        <label>Final Revenue (₹)</label>
                        <input className="form-input" type="number" value={endRevenue} onChange={e => setEndRevenue(e.target.value)} />
                    </div>
                    <div className="modal-footer" style={{ padding: '16px 0 0', border: 'none' }}>
                        <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
                        <button className="btn btn-success" onClick={() => updateStatus(statusModal, 'Completed')}>✅ Mark Completed</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
