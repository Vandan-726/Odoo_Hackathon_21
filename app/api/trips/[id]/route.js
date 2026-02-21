import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = await getDb();
        const body = await request.json();
        const existing = await db.query('SELECT * FROM trips WHERE id = $1', [params.id]);
        if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const trip = existing.rows[0];

        const { status, end_odometer, revenue } = body;

        if (status === 'Dispatched' && trip.status === 'Draft') {
            await db.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['On Trip', trip.vehicle_id]);
            await db.query('UPDATE drivers SET status = $1 WHERE id = $2', ['On Trip', trip.driver_id]);
            await db.query('UPDATE trips SET status = $1, dispatched_at = NOW() WHERE id = $2', ['Dispatched', params.id]);
        } else if (status === 'Completed' && (trip.status === 'Dispatched' || trip.status === 'Draft')) {
            await db.query('UPDATE vehicles SET status = $1, odometer = $2 WHERE id = $3',
                ['Available', end_odometer || trip.start_odometer, trip.vehicle_id]);
            await db.query('UPDATE drivers SET status = $1 WHERE id = $2', ['On Duty', trip.driver_id]);
            await db.query('UPDATE trips SET status = $1, end_odometer = $2, revenue = $3, completed_at = NOW() WHERE id = $4',
                ['Completed', end_odometer || trip.start_odometer, revenue ?? trip.revenue, params.id]);
        } else if (status === 'Cancelled') {
            if (trip.status === 'Dispatched') {
                await db.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Available', trip.vehicle_id]);
                await db.query('UPDATE drivers SET status = $1 WHERE id = $2', ['On Duty', trip.driver_id]);
            }
            await db.query('UPDATE trips SET status = $1 WHERE id = $2', ['Cancelled', params.id]);
        } else {
            if (revenue !== undefined) {
                await db.query('UPDATE trips SET revenue = $1 WHERE id = $2', [revenue, params.id]);
            }
        }

        const updated = await db.query(
            `SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name 
       FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id WHERE t.id = $1`,
            [params.id]
        );
        return NextResponse.json(updated.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
