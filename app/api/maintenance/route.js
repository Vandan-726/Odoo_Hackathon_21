import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateMaintenance } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = await getDb();
        const res = await db.query(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m 
       JOIN vehicles v ON m.vehicle_id = v.id 
       ORDER BY m.service_date DESC`
        );
        return NextResponse.json(res.rows);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const body = await request.json();

        const check = validateMaintenance(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, service_type, description, cost, service_date } = body;

        const vehRes = await db.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
        if (vehRes.rows.length === 0) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

        await db.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['In Shop', vehicle_id]);

        const result = await db.query(
            'INSERT INTO maintenance (vehicle_id, service_type, description, cost, service_date) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [vehicle_id, service_type, description?.trim() || '', Number(cost) || 0, service_date]
        );

        const logRes = await db.query(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = $1`,
            [result.rows[0].id]
        );

        return NextResponse.json(logRes.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
