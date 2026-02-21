import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = getDb();
        const body = await request.json();
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id);
        if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { status, end_odometer, revenue } = body;

        // Handle status transitions
        if (status === 'Dispatched' && trip.status === 'Draft') {
            db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('On Trip', trip.vehicle_id);
            db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run('On Trip', trip.driver_id);
            db.prepare('UPDATE trips SET status = ?, dispatched_at = CURRENT_TIMESTAMP WHERE id = ?').run('Dispatched', params.id);
        } else if (status === 'Completed' && (trip.status === 'Dispatched' || trip.status === 'Draft')) {
            db.prepare('UPDATE vehicles SET status = ?, odometer = ? WHERE id = ?')
                .run('Available', end_odometer || trip.start_odometer, trip.vehicle_id);
            db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run('On Duty', trip.driver_id);
            db.prepare('UPDATE trips SET status = ?, end_odometer = ?, revenue = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run('Completed', end_odometer || trip.start_odometer, revenue ?? trip.revenue, params.id);
        } else if (status === 'Cancelled') {
            if (trip.status === 'Dispatched') {
                db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('Available', trip.vehicle_id);
                db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run('On Duty', trip.driver_id);
            }
            db.prepare('UPDATE trips SET status = ? WHERE id = ?').run('Cancelled', params.id);
        } else {
            // Generic update
            if (revenue !== undefined) {
                db.prepare('UPDATE trips SET revenue = ? WHERE id = ?').run(revenue, params.id);
            }
        }

        const updated = db.prepare(
            `SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name 
       FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id WHERE t.id = ?`
        ).get(params.id);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
