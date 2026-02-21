import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function GET() {
    try {
        const db = getDb();

        // KPIs
        const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
        const activeFleet = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'On Trip'").get().count;
        const inShop = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'In Shop'").get().count;
        const available = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'").get().count;
        const pendingCargo = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status IN ('Draft')").get().count;
        const totalDrivers = db.prepare('SELECT COUNT(*) as count FROM drivers').get().count;
        const driversOnTrip = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'On Trip'").get().count;

        const utilizationRate = totalVehicles > 0 ? Math.round(((activeFleet + inShop) / totalVehicles) * 100) : 0;

        // Fuel efficiency per vehicle (km/L)
        const fuelEfficiency = db.prepare(`
      SELECT v.id, v.name, v.license_plate,
        COALESCE(SUM(e.liters), 0) as total_liters,
        COALESCE(SUM(e.cost), 0) as total_fuel_cost,
        (SELECT COALESCE(SUM(t.end_odometer - t.start_odometer), 0) 
         FROM trips t WHERE t.vehicle_id = v.id AND t.status = 'Completed' AND t.end_odometer IS NOT NULL) as total_km
      FROM vehicles v
      LEFT JOIN expenses e ON e.vehicle_id = v.id AND e.type = 'Fuel'
      GROUP BY v.id
      HAVING total_liters > 0
    `).all().map(v => ({
            ...v,
            km_per_liter: v.total_liters > 0 ? (v.total_km / v.total_liters).toFixed(2) : '0'
        }));

        // Cost breakdown per vehicle
        const costBreakdown = db.prepare(`
      SELECT v.id, v.name, v.license_plate, v.acquisition_cost,
        COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id AND type = 'Fuel'), 0) as fuel_cost,
        COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) as maintenance_cost,
        COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id AND type != 'Fuel'), 0) as other_cost,
        COALESCE((SELECT SUM(revenue) FROM trips WHERE vehicle_id = v.id AND status = 'Completed'), 0) as total_revenue
      FROM vehicles v
      ORDER BY v.name
    `).all().map(v => ({
            ...v,
            total_cost: v.fuel_cost + v.maintenance_cost + v.other_cost,
            roi: v.acquisition_cost > 0
                ? (((v.total_revenue - (v.fuel_cost + v.maintenance_cost)) / v.acquisition_cost) * 100).toFixed(1)
                : '0'
        }));

        // Monthly expenses (last 6 months)
        const monthlyExpenses = db.prepare(`
      SELECT strftime('%Y-%m', expense_date) as month,
        SUM(CASE WHEN type = 'Fuel' THEN cost ELSE 0 END) as fuel,
        SUM(CASE WHEN type != 'Fuel' THEN cost ELSE 0 END) as other,
        SUM(cost) as total
      FROM expenses
      GROUP BY strftime('%Y-%m', expense_date)
      ORDER BY month DESC
      LIMIT 6
    `).all().reverse();

        // Monthly maintenance
        const monthlyMaintenance = db.prepare(`
      SELECT strftime('%Y-%m', service_date) as month,
        SUM(cost) as total
      FROM maintenance
      GROUP BY strftime('%Y-%m', service_date)
      ORDER BY month DESC
      LIMIT 6
    `).all().reverse();

        // Trip stats
        const completedTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'Completed'").get().count;
        const totalRevenue = db.prepare("SELECT COALESCE(SUM(revenue), 0) as total FROM trips WHERE status = 'Completed'").get().total;
        const totalExpenses = db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM expenses").get().total;
        const totalMaintCost = db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM maintenance").get().total;

        return NextResponse.json({
            kpis: {
                totalVehicles, activeFleet, inShop, available, pendingCargo,
                utilizationRate, totalDrivers, driversOnTrip,
                completedTrips, totalRevenue, totalExpenses, totalMaintCost
            },
            fuelEfficiency,
            costBreakdown,
            monthlyExpenses,
            monthlyMaintenance
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
