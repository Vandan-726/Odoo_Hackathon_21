import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateTrip } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = `SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity_kg, d.name as driver_name 
                 FROM trips t 
                 JOIN vehicles v ON t.vehicle_id = v.id 
                 JOIN drivers d ON t.driver_id = d.id WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND t.status = ?'; params.push(status); }
        query += ' ORDER BY t.created_at DESC';

        const trips = db.prepare(query).all(...params);
        return NextResponse.json(trips);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Step 1: Basic field validation
        const check = validateTrip(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, revenue } = body;

        // Step 2: Check vehicle exists and is available
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        if (vehicle.status !== 'Available') {
            return NextResponse.json({ error: `Vehicle is currently "${vehicle.status}" and cannot be assigned` }, { status: 400 });
        }

        // Step 3: Validate cargo weight does not exceed vehicle capacity
        const weight = Number(cargo_weight_kg) || 0;
        if (weight > vehicle.max_capacity_kg) {
            return NextResponse.json({
                error: `Cargo weight (${weight}kg) exceeds vehicle max capacity (${vehicle.max_capacity_kg}kg)`
            }, { status: 400 });
        }

        // Step 4: Check driver exists and is available
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
        if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        if (driver.status === 'On Trip') {
            return NextResponse.json({ error: 'Driver is currently on another trip' }, { status: 400 });
        }
        if (driver.status === 'Suspended') {
            return NextResponse.json({ error: 'Driver is suspended and cannot be assigned' }, { status: 400 });
        }

        // Step 5: Check license expiry
        const today = new Date().toISOString().split('T')[0];
        if (driver.license_expiry < today) {
            return NextResponse.json({ error: `Driver's license expired on ${driver.license_expiry} — cannot assign to trip` }, { status: 400 });
        }

        // Step 6: Check license category matches vehicle type
        if (driver.license_category !== vehicle.type) {
            return NextResponse.json({
                error: `Driver license category (${driver.license_category}) does not match vehicle type (${vehicle.type})`
            }, { status: 400 });
        }

        // Step 7: Insert trip
        const result = db.prepare(
            'INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight_kg, cargo_description, start_odometer, revenue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(vehicle_id, driver_id, origin.trim(), destination.trim(), weight, cargo_description?.trim() || '', vehicle.odometer, Number(revenue) || 0);

        const trip = db.prepare(
            `SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name 
       FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id WHERE t.id = ?`
        ).get(result.lastInsertRowid);

        return NextResponse.json(trip, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
