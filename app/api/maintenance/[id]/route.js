import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = await getDb();
        const body = await request.json();
        const existing = await db.query('SELECT * FROM maintenance WHERE id = $1', [params.id]);
        if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const log = existing.rows[0];

        const { status, cost, description } = body;
        await db.query('UPDATE maintenance SET status=$1, cost=$2, description=$3 WHERE id=$4',
            [status || log.status, cost ?? log.cost, description ?? log.description, params.id]);

        if (status === 'Completed') {
            await db.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Available', log.vehicle_id]);
        }

        const updated = await db.query(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = $1`,
            [params.id]
        );
        return NextResponse.json(updated.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
