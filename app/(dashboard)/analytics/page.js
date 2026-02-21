'use client';
import { useState, useEffect, useRef } from 'react';
import { Chart, BarController, LineController, DoughnutController, PieController, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';

Chart.register(BarController, LineController, DoughnutController, PieController, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const CHART_DEFAULTS = { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { display: false } } };

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const fuelRef = useRef(null);
    const revenueRef = useRef(null);
    const costRef = useRef(null);
    const typeRef = useRef(null);
    const charts = useRef([]);

    useEffect(() => {
        fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    useEffect(() => {
        if (!data || loading) return;

        // Destroy old charts
        charts.current.forEach(c => c.destroy());
        charts.current = [];

        const kpis = data.kpis || {};
        const costBreakdown = data.costBreakdown || [];

        // Fuel Efficiency Bar Chart
        if (fuelRef.current) {
            const labels = (data.fuelEfficiency || []).map(v => v.vehicle_name);
            const values = (data.fuelEfficiency || []).map(v => v.cost_per_km || 0);
            charts.current.push(new Chart(fuelRef.current, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Cost / km (₹)', data: values, backgroundColor: '#714b67', borderRadius: 4 }] },
                options: { ...CHART_DEFAULTS, scales: { y: { beginAtZero: true } } },
            }));
        }

        // Revenue vs Expenses Line Chart
        if (revenueRef.current) {
            const trends = data.monthlyTrends || [];
            const labels = trends.map(t => t.month);
            charts.current.push(new Chart(revenueRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Revenue', data: trends.map(t => t.revenue || 0), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.08)', fill: true, tension: .3, pointRadius: 2 },
                        { label: 'Expenses', data: trends.map(t => t.expenses || 0), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.06)', fill: true, tension: .3, pointRadius: 2 },
                    ],
                },
                options: { ...CHART_DEFAULTS, plugins: { legend: { display: true } } },
            }));
        }

        // Cost breakdown Doughnut
        if (costRef.current) {
            const top5 = costBreakdown.slice(0, 5);
            charts.current.push(new Chart(costRef.current, {
                type: 'doughnut',
                data: {
                    labels: top5.map(v => v.vehicle_name),
                    datasets: [{ data: top5.map(v => v.total_cost || 0), backgroundColor: ['#714b67', '#8a6580', '#b0a8ad', '#c4a3a6', '#ddd'] }],
                },
                options: { ...CHART_DEFAULTS, plugins: { legend: { display: true, position: 'bottom' } } },
            }));
        }

        // Fleet type Pie
        if (typeRef.current) {
            const vehicleTypes = data.vehicleTypes || { Truck: 0, Van: 0, Bike: 0 };
            charts.current.push(new Chart(typeRef.current, {
                type: 'pie',
                data: {
                    labels: Object.keys(vehicleTypes),
                    datasets: [{ data: Object.values(vehicleTypes), backgroundColor: ['#714b67', '#b0a8ad', '#c4a3a6'] }],
                },
                options: { ...CHART_DEFAULTS, plugins: { legend: { display: true, position: 'bottom' } } },
            }));
        }

        return () => { charts.current.forEach(c => c.destroy()); };
    }, [data, loading]);

    const exportCSV = () => {
        if (!data) return;
        const rows = [['Vehicle', 'Total Cost', 'Fuel', 'Maintenance', 'Revenue', 'ROI %']];
        (data.costBreakdown || []).forEach(v => {
            rows.push([v.vehicle_name, v.total_cost, v.fuel_cost, v.maintenance_cost, v.revenue, v.roi]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fleetflow_analytics.csv'; a.click();
    };

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('FleetFlow Analytics Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

        const kpis = data?.kpis || {};
        doc.autoTable({
            startY: 35,
            head: [['Metric', 'Value']],
            body: [
                ['Total Vehicles', kpis.totalVehicles],
                ['Active Fleet', kpis.activeFleet],
                ['Total Revenue', `₹${(kpis.totalRevenue || 0).toLocaleString()}`],
                ['Total Expenses', `₹${((kpis.totalExpenses || 0) + (kpis.totalMaintCost || 0)).toLocaleString()}`],
                ['Fleet ROI', `${data?.overallROI || 0}%`],
            ],
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 12,
            head: [['Vehicle', 'Total Cost', 'Fuel', 'Maintenance', 'Revenue', 'ROI %']],
            body: (data?.costBreakdown || []).map(v => [v.vehicle_name, `₹${v.total_cost}`, `₹${v.fuel_cost}`, `₹${v.maintenance_cost}`, `₹${v.revenue}`, `${v.roi}%`]),
        });

        doc.save('fleetflow_analytics.pdf');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>Loading analytics...</div>;

    const kpis = data?.kpis || {};

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Analytics & Reports</h1>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
                    <button className="btn btn-primary" onClick={exportPDF}>Export PDF</button>
                </div>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-card-icon green"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg></div>
                    <div className="kpi-label">Total Revenue</div>
                    <div className="kpi-value">₹{(kpis.totalRevenue || 0).toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon red"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div>
                    <div className="kpi-label">Total Expenses</div>
                    <div className="kpi-value">₹{((kpis.totalExpenses || 0) + (kpis.totalMaintCost || 0)).toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon blue"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></div>
                    <div className="kpi-label">Fleet ROI</div>
                    <div className="kpi-value">{data?.overallROI || 0}%</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon purple"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14V9l-2-4H7L5 9v8z" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /><path d="M5 9h14" /></svg></div>
                    <div className="kpi-label">Total Vehicles</div>
                    <div className="kpi-value">{kpis.totalVehicles || 0}</div>
                </div>
            </div>

            {/* Charts — 2 side by side matching wireframe */}
            <div className="chart-grid">
                <div className="chart-card">
                    <h3>Fuel Cost per KM</h3>
                    <div style={{ height: 250 }}><canvas ref={fuelRef}></canvas></div>
                </div>
                <div className="chart-card">
                    <h3>Revenue vs Expenses</h3>
                    <div style={{ height: 250 }}><canvas ref={revenueRef}></canvas></div>
                </div>
            </div>
            <div className="chart-grid">
                <div className="chart-card">
                    <h3>Cost Breakdown by Vehicle</h3>
                    <div style={{ height: 250 }}><canvas ref={costRef}></canvas></div>
                </div>
                <div className="chart-card">
                    <h3>Fleet Composition</h3>
                    <div style={{ height: 250 }}><canvas ref={typeRef}></canvas></div>
                </div>
            </div>

            {/* Financial Summary Table */}
            <div className="table-container" style={{ marginTop: 20 }}>
                <div className="table-toolbar">
                    <h3>Financial Summary by Vehicle</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle</th>
                            <th>Total Cost</th>
                            <th>Fuel</th>
                            <th>Maintenance</th>
                            <th>Revenue</th>
                            <th>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.costBreakdown || []).map((v, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{v.vehicle_name}</td>
                                <td>₹{(v.total_cost || 0).toLocaleString()}</td>
                                <td>₹{(v.fuel_cost || 0).toLocaleString()}</td>
                                <td>₹{(v.maintenance_cost || 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--green)', fontWeight: 600 }}>₹{(v.revenue || 0).toLocaleString()}</td>
                                <td style={{ fontWeight: 600, color: v.roi > 0 ? 'var(--green)' : 'var(--red)' }}>{v.roi}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
