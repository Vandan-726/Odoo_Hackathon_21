import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateVehicle } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const region = searchParams.get('region');

        let query = 'SELECT * FROM vehicles WHERE 1=1';
        const params = [];
        if (type) { query += ' AND type = ?'; params.push(type); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (region) { query += ' AND region = ?'; params.push(region); }
        query += ' ORDER BY created_at DESC';

        const vehicles = db.prepare(query).all(...params);
        return NextResponse.json(vehicles);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Centralized validation
        const check = validateVehicle(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { name, model, license_plate, type, max_capacity_kg, odometer, region, acquisition_cost } = body;

        // Uniqueness check
        const existing = db.prepare('SELECT id FROM vehicles WHERE license_plate = ?').get(license_plate.trim());
        if (existing) {
            return NextResponse.json({ error: 'License plate already exists in the system' }, { status: 409 });
        }

        const result = db.prepare(
            'INSERT INTO vehicles (name, model, license_plate, type, max_capacity_kg, odometer, region, acquisition_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(name.trim(), model.trim(), license_plate.trim().toUpperCase(), type, Number(max_capacity_kg) || 0, Number(odometer) || 0, region || 'Default', Number(acquisition_cost) || 0);

        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
        return NextResponse.json(vehicle, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
