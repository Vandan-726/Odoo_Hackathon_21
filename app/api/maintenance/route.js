import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateMaintenance } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = getDb();
        const logs = db.prepare(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m 
       JOIN vehicles v ON m.vehicle_id = v.id 
       ORDER BY m.service_date DESC`
        ).all();
        return NextResponse.json(logs);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Centralized validation
        const check = validateMaintenance(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, service_type, description, cost, service_date } = body;

        // Verify vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

        // Auto-set vehicle status to "In Shop" — this is a core business rule
        db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('In Shop', vehicle_id);

        const result = db.prepare(
            'INSERT INTO maintenance (vehicle_id, service_type, description, cost, service_date) VALUES (?, ?, ?, ?, ?)'
        ).run(vehicle_id, service_type, description?.trim() || '', Number(cost) || 0, service_date);

        const log = db.prepare(
            `SELECT m.*, v.name as vehicle_name, v.license_plate 
       FROM maintenance m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = ?`
        ).get(result.lastInsertRowid);

        return NextResponse.json(log, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
