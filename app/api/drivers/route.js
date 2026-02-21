import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateDriver } = require('@/lib/validate');

export async function GET() {
    try {
        const db = getDb();
        const drivers = db.prepare('SELECT * FROM drivers ORDER BY created_at DESC').all();
        return NextResponse.json(drivers);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Centralized validation
        const check = validateDriver(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { name, email, phone, license_number, license_category, license_expiry, safety_score } = body;

        // Uniqueness check
        const existing = db.prepare('SELECT id FROM drivers WHERE license_number = ?').get(license_number.trim());
        if (existing) {
            return NextResponse.json({ error: 'A driver with this license number already exists' }, { status: 409 });
        }

        const result = db.prepare(
            'INSERT INTO drivers (name, email, phone, license_number, license_category, license_expiry, safety_score) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(name.trim(), email?.trim() || '', phone?.trim() || '', license_number.trim(), license_category, license_expiry, Number(safety_score) || 100);

        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
        return NextResponse.json(driver, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
