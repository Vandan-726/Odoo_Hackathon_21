import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateExpense } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const vehicleId = searchParams.get('vehicle_id');

        let query = `SELECT e.*, v.name as vehicle_name, v.license_plate 
                 FROM expenses e 
                 JOIN vehicles v ON e.vehicle_id = v.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (vehicleId) { query += ` AND e.vehicle_id = $${idx++}`; params.push(vehicleId); }
        query += ' ORDER BY e.expense_date DESC';

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

        const check = validateExpense(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, trip_id, type, liters, cost, expense_date, notes } = body;

        const vehRes = await db.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
        if (vehRes.rows.length === 0) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

        if (trip_id) {
            const tripRes = await db.query('SELECT id FROM trips WHERE id = $1', [trip_id]);
            if (tripRes.rows.length === 0) return NextResponse.json({ error: 'Linked trip not found' }, { status: 404 });
        }

        const result = await db.query(
            'INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, expense_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [vehicle_id, trip_id || null, type, Number(liters) || 0, Number(cost), expense_date, notes?.trim() || '']
        );

        const expRes = await db.query(
            `SELECT e.*, v.name as vehicle_name, v.license_plate 
       FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id WHERE e.id = $1`,
            [result.rows[0].id]
        );

        return NextResponse.json(expRes.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
