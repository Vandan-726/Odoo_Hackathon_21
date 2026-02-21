'use client';
import { useState, useEffect, useRef } from 'react';

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const chartRefs = useRef({});
    const chartInstances = useRef({});

    useEffect(() => {
        fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    useEffect(() => {
        if (!data) return;
        let Chart;
        import('chart.js/auto').then(mod => {
            Chart = mod.default;
            renderCharts(Chart);
        });
        return () => {
            Object.values(chartInstances.current).forEach(c => c?.destroy());
        };
    }, [data]);

    const renderCharts = (Chart) => {
        // Destroy existing
        Object.values(chartInstances.current).forEach(c => c?.destroy());

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { family: 'Inter' }, color: '#475569' } } },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: '#f1f5f9' } },
                y: { ticks: { color: '#94a3b8', font: { family: 'Inter' } }, grid: { color: '#f1f5f9' } }
            }
        };

        // Fuel Efficiency Chart
        if (chartRefs.current.fuel && data.fuelEfficiency?.length) {
            chartInstances.current.fuel = new Chart(chartRefs.current.fuel, {
                type: 'bar',
                data: {
                    labels: data.fuelEfficiency.map(v => v.name),
                    datasets: [{
                        label: 'km/L',
                        data: data.fuelEfficiency.map(v => parseFloat(v.km_per_liter)),
                        backgroundColor: 'rgba(168, 213, 213, 0.6)',
                        borderColor: '#a8d5d5',
                        borderWidth: 2,
                        borderRadius: 6,
                    }]
                },
                options: { ...baseOptions, plugins: { ...baseOptions.plugins, title: { display: false } } }
            });
        }

        // Cost Breakdown Chart
        if (chartRefs.current.cost && data.costBreakdown?.length) {
            chartInstances.current.cost = new Chart(chartRefs.current.cost, {
                type: 'bar',
                data: {
                    labels: data.costBreakdown.map(v => v.name),
                    datasets: [
                        { label: 'Fuel', data: data.costBreakdown.map(v => v.fuel_cost), backgroundColor: 'rgba(168, 213, 213, 0.7)', borderRadius: 4 },
                        { label: 'Maintenance', data: data.costBreakdown.map(v => v.maintenance_cost), backgroundColor: 'rgba(212, 165, 168, 0.7)', borderRadius: 4 },
                        { label: 'Other', data: data.costBreakdown.map(v => v.other_cost), backgroundColor: 'rgba(148, 163, 184, 0.4)', borderRadius: 4 }
                    ]
                },
                options: { ...baseOptions, scales: { ...baseOptions.scales, x: { ...baseOptions.scales.x, stacked: true }, y: { ...baseOptions.scales.y, stacked: true } } }
            });
        }

        // ROI Chart
        if (chartRefs.current.roi && data.costBreakdown?.length) {
            const roiData = data.costBreakdown.filter(v => parseFloat(v.roi) !== 0);
            chartInstances.current.roi = new Chart(chartRefs.current.roi, {
                type: 'doughnut',
                data: {
                    labels: roiData.map(v => v.name),
                    datasets: [{
                        data: roiData.map(v => Math.abs(parseFloat(v.roi))),
                        backgroundColor: ['#a8d5d5', '#d4a5a8', '#8b6f71', '#EAF4F4', '#F1E3E4', '#94a3b8', '#6366f1', '#a855f7'],
                        borderWidth: 2,
                        borderColor: '#fff',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter' }, color: '#475569', padding: 16 } } }
                }
            });
        }

        // Monthly Trend
        if (chartRefs.current.monthly && data.monthlyExpenses?.length) {
            chartInstances.current.monthly = new Chart(chartRefs.current.monthly, {
                type: 'line',
                data: {
                    labels: data.monthlyExpenses.map(m => m.month),
                    datasets: [{
                        label: 'Total Expenses',
                        data: data.monthlyExpenses.map(m => m.total),
                        borderColor: '#8b6f71',
                        backgroundColor: 'rgba(241, 227, 228, 0.3)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#8b6f71',
                        pointRadius: 5,
                    }]
                },
                options: baseOptions
            });
        }
    };

    const exportCSV = () => {
        if (!data) return;
        let csv = 'Vehicle,Fuel Cost,Maintenance Cost,Other Cost,Total Cost,Revenue,ROI %\n';
        data.costBreakdown.forEach(v => {
            csv += `${v.name},${v.fuel_cost},${v.maintenance_cost},${v.other_cost},${v.total_cost},${v.total_revenue},${v.roi}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'fleetflow-report.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('FleetFlow — Financial Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        const rows = data.costBreakdown.map(v => [v.name, `₹${v.fuel_cost}`, `₹${v.maintenance_cost}`, `₹${v.other_cost}`, `₹${v.total_cost}`, `₹${v.total_revenue}`, `${v.roi}%`]);
        doc.autoTable({
            head: [['Vehicle', 'Fuel', 'Maintenance', 'Other', 'Total Cost', 'Revenue', 'ROI']],
            body: rows,
            startY: 38,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [139, 111, 113] },
        });
        doc.save('fleetflow-report.pdf');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div>;

    const kpis = data?.kpis || {};

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>📈 Analytics & Reports</h1>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
                    <button className="btn btn-primary" onClick={exportPDF}>📄 Export PDF</button>
                </div>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="kpi-card">
                    <div className="kpi-card-icon green">💵</div>
                    <div className="kpi-label">Total Revenue</div>
                    <div className="kpi-value">₹{(kpis.totalRevenue || 0).toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon yellow">⛽</div>
                    <div className="kpi-label">Fuel Expenses</div>
                    <div className="kpi-value">₹{(kpis.totalExpenses || 0).toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon red">🔧</div>
                    <div className="kpi-label">Maintenance Cost</div>
                    <div className="kpi-value">₹{(kpis.totalMaintCost || 0).toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-icon blue">📊</div>
                    <div className="kpi-label">Net Profit</div>
                    <div className="kpi-value" style={{ color: (kpis.totalRevenue - kpis.totalExpenses - kpis.totalMaintCost) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ₹{((kpis.totalRevenue || 0) - (kpis.totalExpenses || 0) - (kpis.totalMaintCost || 0)).toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="chart-grid">
                <div className="chart-card">
                    <h3>⛽ Fuel Efficiency (km/L)</h3>
                    <div style={{ height: 280 }}><canvas ref={el => chartRefs.current.fuel = el}></canvas></div>
                </div>
                <div className="chart-card">
                    <h3>📊 Cost Breakdown by Vehicle</h3>
                    <div style={{ height: 280 }}><canvas ref={el => chartRefs.current.cost = el}></canvas></div>
                </div>
            </div>

            <div className="chart-grid">
                <div className="chart-card">
                    <h3>🍩 Vehicle ROI Distribution</h3>
                    <div style={{ height: 280 }}><canvas ref={el => chartRefs.current.roi = el}></canvas></div>
                </div>
                <div className="chart-card">
                    <h3>📈 Monthly Expense Trend</h3>
                    <div style={{ height: 280 }}><canvas ref={el => chartRefs.current.monthly = el}></canvas></div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <h3>📋 Vehicle Financial Summary</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle</th>
                            <th>Fuel Cost</th>
                            <th>Maintenance</th>
                            <th>Other</th>
                            <th>Total Cost</th>
                            <th>Revenue</th>
                            <th>ROI %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.costBreakdown || []).map(v => (
                            <tr key={v.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({v.license_plate})</span></td>
                                <td>₹{v.fuel_cost.toLocaleString()}</td>
                                <td>₹{v.maintenance_cost.toLocaleString()}</td>
                                <td>₹{v.other_cost.toLocaleString()}</td>
                                <td style={{ fontWeight: 600 }}>₹{v.total_cost.toLocaleString()}</td>
                                <td style={{ color: 'var(--success)' }}>₹{v.total_revenue.toLocaleString()}</td>
                                <td style={{ fontWeight: 700, color: parseFloat(v.roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{v.roi}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
