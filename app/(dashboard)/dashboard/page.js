'use client';
import { useState, useEffect } from 'react';
import StatusPill from '@/components/StatusPill';

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState(null);
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/analytics').then(r => r.json()),
            fetch('/api/trips').then(r => r.json()),
        ]).then(([a, t]) => {
            setAnalytics(a);
            setTrips(t);
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>;

    const kpis = analytics?.kpis || {};

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>📊 Command Center</h1>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-card-icon blue">🚚</div>
                    <div className="kpi-label">Active Fleet</div>
                    <div className="kpi-value">{kpis.activeFleet || 0}</div>
                    <div className="kpi-sub">{kpis.totalVehicles} total vehicles</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon yellow">🔧</div>
                    <div className="kpi-label">Maintenance Alerts</div>
                    <div className="kpi-value">{kpis.inShop || 0}</div>
                    <div className="kpi-sub">Vehicles in shop</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon green">📈</div>
                    <div className="kpi-label">Utilization Rate</div>
                    <div className="kpi-value">{kpis.utilizationRate || 0}%</div>
                    <div className="kpi-sub">{kpis.available} available</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon purple">📦</div>
                    <div className="kpi-label">Pending Cargo</div>
                    <div className="kpi-value">{kpis.pendingCargo || 0}</div>
                    <div className="kpi-sub">Awaiting dispatch</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div className="kpi-card">
                    <div className="kpi-card-icon green">💵</div>
                    <div className="kpi-label">Total Revenue</div>
                    <div className="kpi-value">₹{(kpis.totalRevenue || 0).toLocaleString()}</div>
                    <div className="kpi-sub">{kpis.completedTrips} completed trips</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon red">📉</div>
                    <div className="kpi-label">Total Expenses</div>
                    <div className="kpi-value">₹{((kpis.totalExpenses || 0) + (kpis.totalMaintCost || 0)).toLocaleString()}</div>
                    <div className="kpi-sub">Fuel + Maintenance</div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <h3>🗺️ Recent Trips</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Trip</th>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>Route</th>
                            <th>Cargo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.slice(0, 8).map(trip => (
                            <tr key={trip.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>TRIP-{String(trip.id).padStart(3, '0')}</td>
                                <td>{trip.vehicle_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({trip.license_plate})</span></td>
                                <td>{trip.driver_name}</td>
                                <td>{trip.origin} → {trip.destination}</td>
                                <td>{trip.cargo_weight_kg} kg</td>
                                <td><StatusPill status={trip.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {trips.length === 0 && <div className="table-empty">No trips yet</div>}
            </div>
        </div>
    );
}
