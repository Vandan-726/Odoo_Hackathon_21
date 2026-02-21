import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateTrip } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = `SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity_kg, d.name as driver_name 
                 FROM trips t 
                 JOIN vehicles v ON t.vehicle_id = v.id 
                 JOIN drivers d ON t.driver_id = d.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (status) { query += ` AND t.status = $${idx++}`; params.push(status); }
        query += ' ORDER BY t.created_at DESC';

        const res = await db.query(query, params);
        return NextResponse.json(res.rows);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const body = await request.json();

        const check = validateTrip(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, revenue } = body;

        const vehRes = await db.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
        if (vehRes.rows.length === 0) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        const vehicle = vehRes.rows[0];
        if (vehicle.status !== 'Available') {
            return NextResponse.json({ error: `Vehicle is currently "${vehicle.status}" and cannot be assigned` }, { status: 400 });
        }

        const weight = Number(cargo_weight_kg) || 0;
        if (weight > vehicle.max_capacity_kg) {
            return NextResponse.json({
                error: `Cargo weight (${weight}kg) exceeds vehicle max capacity (${vehicle.max_capacity_kg}kg)`
            }, { status: 400 });
        }

        const drvRes = await db.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
        if (drvRes.rows.length === 0) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        const driver = drvRes.rows[0];
        if (driver.status === 'On Trip') {
            return NextResponse.json({ error: 'Driver is currently on another trip' }, { status: 400 });
        }
        if (driver.status === 'Suspended') {
            return NextResponse.json({ error: 'Driver is suspended and cannot be assigned' }, { status: 400 });
        }

        const today = new Date().toISOString().split('T')[0];
        if (driver.license_expiry < today) {
            return NextResponse.json({ error: `Driver's license expired on ${driver.license_expiry} — cannot assign to trip` }, { status: 400 });
        }

        if (driver.license_category !== vehicle.type) {
            return NextResponse.json({
                error: `Driver license category (${driver.license_category}) does not match vehicle type (${vehicle.type})`
            }, { status: 400 });
        }

        const result = await db.query(
            'INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, start_odometer, revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
            [vehicle_id, driver_id, origin.trim(), destination.trim(), weight, cargo_description?.trim() || '', vehicle.odometer, Number(revenue) || 0]
        );

        const tripRes = await db.query(
            `SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name 
       FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id WHERE t.id = $1`,
            [result.rows[0].id]
        );

        return NextResponse.json(tripRes.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
