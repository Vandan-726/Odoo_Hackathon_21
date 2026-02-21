import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function GET(request, { params }) {
    try {
        const db = await getDb();
        const res = await db.query('SELECT * FROM vehicles WHERE id = $1', [params.id]);
        if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const db = await getDb();
        const body = await request.json();
        const existing = await db.query('SELECT * FROM vehicles WHERE id = $1', [params.id]);
        if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const vehicle = existing.rows[0];

        const { name, model, license_plate, type, max_capacity_kg, odometer, status, region, acquisition_cost } = body;
        const res = await db.query(
            'UPDATE vehicles SET name=$1, model=$2, license_plate=$3, type=$4, max_capacity_kg=$5, odometer=$6, status=$7, region=$8, acquisition_cost=$9 WHERE id=$10 RETURNING *',
            [
                name || vehicle.name, model || vehicle.model, license_plate || vehicle.license_plate,
                type || vehicle.type, max_capacity_kg ?? vehicle.max_capacity_kg, odometer ?? vehicle.odometer,
                status || vehicle.status, region || vehicle.region, acquisition_cost ?? vehicle.acquisition_cost, params.id
            ]
        );
        return NextResponse.json(res.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const db = await getDb();
        await db.query('DELETE FROM vehicles WHERE id = $1', [params.id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
