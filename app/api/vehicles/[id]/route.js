import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function GET(request, { params }) {
    try {
        const db = getDb();
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id);
        if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(vehicle);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const db = getDb();
        const body = await request.json();
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id);
        if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { name, model, license_plate, type, max_capacity_kg, odometer, status, region, acquisition_cost } = body;
        db.prepare(
            'UPDATE vehicles SET name=?, model=?, license_plate=?, type=?, max_capacity_kg=?, odometer=?, status=?, region=?, acquisition_cost=? WHERE id=?'
        ).run(
            name || vehicle.name, model || vehicle.model, license_plate || vehicle.license_plate,
            type || vehicle.type, max_capacity_kg ?? vehicle.max_capacity_kg, odometer ?? vehicle.odometer,
            status || vehicle.status, region || vehicle.region, acquisition_cost ?? vehicle.acquisition_cost, params.id
        );
        const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const db = getDb();
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(params.id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
