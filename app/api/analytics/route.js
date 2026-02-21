import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function GET() {
  try {
    const db = await getDb();

    // KPIs
    const totalVehicles = (await db.query('SELECT COUNT(*) as count FROM vehicles')).rows[0].count;
    const activeFleet = (await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'On Trip'")).rows[0].count;
    const inShop = (await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'In Shop'")).rows[0].count;
    const available = (await db.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'")).rows[0].count;
    const pendingCargo = (await db.query("SELECT COUNT(*) as count FROM trips WHERE status IN ('Draft')")).rows[0].count;
    const totalDrivers = (await db.query('SELECT COUNT(*) as count FROM drivers')).rows[0].count;
    const driversOnTrip = (await db.query("SELECT COUNT(*) as count FROM drivers WHERE status = 'On Trip'")).rows[0].count;

    const utilizationRate = parseInt(totalVehicles) > 0 ? Math.round(((parseInt(activeFleet) + parseInt(inShop)) / parseInt(totalVehicles)) * 100) : 0;

    // Fuel efficiency per vehicle (km/L)
    const fuelEffRes = await db.query(`
      SELECT v.id, v.name as vehicle_name, v.license_plate,
        COALESCE(SUM(e.liters), 0) as total_liters,
        COALESCE(SUM(e.cost), 0) as total_fuel_cost,
        (SELECT COALESCE(SUM(t.end_odometer - t.start_odometer), 0) 
         FROM trips t WHERE t.vehicle_id = v.id AND t.status = 'Completed' AND t.end_odometer IS NOT NULL) as total_km
      FROM vehicles v
      LEFT JOIN expenses e ON e.vehicle_id = v.id AND e.type = 'Fuel'
      GROUP BY v.id, v.name, v.license_plate
      HAVING COALESCE(SUM(e.liters), 0) > 0
    `);
    const fuelEfficiency = fuelEffRes.rows.map(v => ({
      ...v,
      total_km: parseFloat(v.total_km),
      total_fuel_cost: parseFloat(v.total_fuel_cost),
      km_per_liter: parseFloat(v.total_liters) > 0 ? (parseFloat(v.total_km) / parseFloat(v.total_liters)).toFixed(2) : '0',
      cost_per_km: parseFloat(v.total_km) > 0 ? (parseFloat(v.total_fuel_cost) / parseFloat(v.total_km)).toFixed(2) : '0'
    }));

    // Cost breakdown per vehicle
    const costRes = await db.query(`
      SELECT v.id, v.name as vehicle_name, v.license_plate, v.acquisition_cost,
        COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id AND type = 'Fuel'), 0) as fuel_cost,
        COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) as maintenance_cost,
        COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id AND type != 'Fuel'), 0) as other_cost,
        COALESCE((SELECT SUM(revenue) FROM trips WHERE vehicle_id = v.id AND status = 'Completed'), 0) as total_revenue
      FROM vehicles v
      ORDER BY v.name
    `);
    const costBreakdown = costRes.rows.map(v => ({
      ...v,
      fuel_cost: parseFloat(v.fuel_cost),
      maintenance_cost: parseFloat(v.maintenance_cost),
      other_cost: parseFloat(v.other_cost),
      total_revenue: parseFloat(v.total_revenue),
      revenue: parseFloat(v.total_revenue),
      total_cost: parseFloat(v.fuel_cost) + parseFloat(v.maintenance_cost) + parseFloat(v.other_cost),
      roi: parseFloat(v.acquisition_cost) > 0
        ? (((parseFloat(v.total_revenue) - (parseFloat(v.fuel_cost) + parseFloat(v.maintenance_cost))) / parseFloat(v.acquisition_cost)) * 100).toFixed(1)
        : '0'
    }));

    // Monthly trends - revenue + expenses combined
    const monthlyTrendsRes = await db.query(`
      SELECT m.month,
        COALESCE(m.expenses, 0) as expenses,
        COALESCE(r.revenue, 0) as revenue
      FROM (
        SELECT TO_CHAR(expense_date, 'YYYY-MM') as month, SUM(cost) as expenses
        FROM expenses GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
      ) m
      LEFT JOIN (
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(revenue) as revenue
        FROM trips WHERE status = 'Completed' GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ) r ON r.month = m.month
      ORDER BY m.month DESC LIMIT 6
    `);
    const monthlyTrends = monthlyTrendsRes.rows.reverse().map(r => ({
      month: r.month,
      expenses: parseFloat(r.expenses),
      revenue: parseFloat(r.revenue)
    }));

    // Monthly maintenance
    const monthlyMaintRes = await db.query(`
      SELECT TO_CHAR(service_date, 'YYYY-MM') as month,
        SUM(cost) as total
      FROM maintenance
      GROUP BY TO_CHAR(service_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    `);
    const monthlyMaintenance = monthlyMaintRes.rows.reverse();

    // Vehicle types count
    const vehicleTypesRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE name ILIKE '%truck%') as "Truck",
        COUNT(*) FILTER (WHERE name ILIKE '%van%') as "Van",
        COUNT(*) FILTER (WHERE name ILIKE '%bike%' OR name ILIKE '%motor%') as "Bike",
        COUNT(*) FILTER (WHERE name NOT ILIKE '%truck%' AND name NOT ILIKE '%van%' AND name NOT ILIKE '%bike%' AND name NOT ILIKE '%motor%') as "Other"
      FROM vehicles
    `);
    const vtRow = vehicleTypesRes.rows[0];
    const vehicleTypes = {};
    if (parseInt(vtRow.Truck) > 0) vehicleTypes['Truck'] = parseInt(vtRow.Truck);
    if (parseInt(vtRow.Van) > 0) vehicleTypes['Van'] = parseInt(vtRow.Van);
    if (parseInt(vtRow.Bike) > 0) vehicleTypes['Bike'] = parseInt(vtRow.Bike);
    if (parseInt(vtRow.Other) > 0) vehicleTypes['Other'] = parseInt(vtRow.Other);

    // Trip stats
    const completedTrips = (await db.query("SELECT COUNT(*) as count FROM trips WHERE status = 'Completed'")).rows[0].count;
    const totalRevenue = (await db.query("SELECT COALESCE(SUM(revenue), 0) as total FROM trips WHERE status = 'Completed'")).rows[0].total;
    const totalExpenses = (await db.query("SELECT COALESCE(SUM(cost), 0) as total FROM expenses")).rows[0].total;
    const totalMaintCost = (await db.query("SELECT COALESCE(SUM(cost), 0) as total FROM maintenance")).rows[0].total;

    // Overall ROI
    const totalAcqCost = (await db.query("SELECT COALESCE(SUM(acquisition_cost), 0) as total FROM vehicles")).rows[0].total;
    const overallROI = parseFloat(totalAcqCost) > 0
      ? (((parseFloat(totalRevenue) - parseFloat(totalExpenses) - parseFloat(totalMaintCost)) / parseFloat(totalAcqCost)) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      kpis: {
        totalVehicles: parseInt(totalVehicles), activeFleet: parseInt(activeFleet),
        inShop: parseInt(inShop), available: parseInt(available),
        pendingCargo: parseInt(pendingCargo), utilizationRate,
        totalDrivers: parseInt(totalDrivers), driversOnTrip: parseInt(driversOnTrip),
        completedTrips: parseInt(completedTrips),
        totalRevenue: parseFloat(totalRevenue),
        totalExpenses: parseFloat(totalExpenses),
        totalMaintCost: parseFloat(totalMaintCost)
      },
      fuelEfficiency,
      costBreakdown,
      monthlyTrends,
      monthlyExpenses: monthlyTrends,
      monthlyMaintenance,
      vehicleTypes,
      overallROI: parseFloat(overallROI)
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
