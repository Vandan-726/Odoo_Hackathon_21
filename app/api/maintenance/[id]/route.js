import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = getDb();
        const body = await request.json();
        const log = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(params.id);
        if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { status, cost, description } = body;
        db.prepare('UPDATE maintenance SET status=?, cost=?, description=? WHERE id=?')
            .run(status || log.status, cost ?? log.cost, description ?? log.description, params.id);

        // If completed, set vehicle back to Available
        if (status === 'Completed') {
            db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('Available', log.vehicle_id);
        }

        const updated = db.prepare(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = ?`
        ).get(params.id);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
