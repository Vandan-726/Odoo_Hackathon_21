import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

export async function PUT(request, { params }) {
    try {
        const db = await getDb();
        const body = await request.json();
        const existing = await db.query('SELECT * FROM drivers WHERE id = $1', [params.id]);
        if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const driver = existing.rows[0];

        const { name, email, phone, license_number, license_category, license_expiry, status, safety_score } = body;
        const res = await db.query(
            'UPDATE drivers SET name=$1, email=$2, phone=$3, license_number=$4, license_category=$5, license_expiry=$6, status=$7, safety_score=$8 WHERE id=$9 RETURNING *',
            [
                name || driver.name, email ?? driver.email, phone ?? driver.phone,
                license_number || driver.license_number, license_category || driver.license_category,
                license_expiry || driver.license_expiry, status || driver.status,
                safety_score ?? driver.safety_score, params.id
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
        await db.query('DELETE FROM drivers WHERE id = $1', [params.id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
