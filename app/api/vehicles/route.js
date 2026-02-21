import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateVehicle } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const region = searchParams.get('region');

        let query = 'SELECT * FROM vehicles WHERE 1=1';
        const params = [];
        let idx = 1;
        if (type) { query += ` AND type = $${idx++}`; params.push(type); }
        if (status) { query += ` AND status = $${idx++}`; params.push(status); }
        if (region) { query += ` AND region = $${idx++}`; params.push(region); }
        query += ' ORDER BY created_at DESC';

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

        const check = validateVehicle(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { name, model, license_plate, type, max_capacity_kg, odometer, region, acquisition_cost } = body;

        const existing = await db.query('SELECT id FROM vehicles WHERE license_plate = $1', [license_plate.trim()]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'License plate already exists in the system' }, { status: 409 });
        }

        const result = await db.query(
            'INSERT INTO vehicles (name, model, license_plate, type, max_capacity_kg, odometer, region, acquisition_cost) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [name.trim(), model.trim(), license_plate.trim().toUpperCase(), type, Number(max_capacity_kg) || 0, Number(odometer) || 0, region || 'Default', Number(acquisition_cost) || 0]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
