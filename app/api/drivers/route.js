import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateDriver } = require('@/lib/validate');

export async function GET() {
    try {
        const db = await getDb();
        const res = await db.query('SELECT * FROM drivers ORDER BY created_at DESC');
        return NextResponse.json(res.rows);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const body = await request.json();

        const check = validateDriver(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { name, email, phone, license_number, license_category, license_expiry, safety_score } = body;

        const existing = await db.query('SELECT id FROM drivers WHERE license_number = $1', [license_number.trim()]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'A driver with this license number already exists' }, { status: 409 });
        }

        const result = await db.query(
            'INSERT INTO drivers (name, email, phone, license_number, license_category, license_expiry, safety_score) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [name.trim(), email?.trim() || '', phone?.trim() || '', license_number.trim(), license_category, license_expiry, Number(safety_score) || 100]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
