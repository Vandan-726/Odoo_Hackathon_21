import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = getDb();
        const body = await request.json();
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(params.id);
        if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const { name, email, phone, license_number, license_category, license_expiry, status, safety_score } = body;
        db.prepare(
            'UPDATE drivers SET name=?, email=?, phone=?, license_number=?, license_category=?, license_expiry=?, status=?, safety_score=? WHERE id=?'
        ).run(
            name || driver.name, email ?? driver.email, phone ?? driver.phone,
            license_number || driver.license_number, license_category || driver.license_category,
            license_expiry || driver.license_expiry, status || driver.status,
            safety_score ?? driver.safety_score, params.id
        );
        const updated = db.prepare('SELECT * FROM drivers WHERE id = ?').get(params.id);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const db = getDb();
        db.prepare('DELETE FROM drivers WHERE id = ?').run(params.id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
