import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { validateExpense } = require('@/lib/validate');

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const vehicleId = searchParams.get('vehicle_id');

        let query = `SELECT e.*, v.name as vehicle_name, v.license_plate 
                 FROM expenses e 
                 JOIN vehicles v ON e.vehicle_id = v.id WHERE 1=1`;
        const params = [];
        if (vehicleId) { query += ' AND e.vehicle_id = ?'; params.push(vehicleId); }
        query += ' ORDER BY e.expense_date DESC';

        const expenses = db.prepare(query).all(...params);
        return NextResponse.json(expenses);
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Centralized validation
        const check = validateExpense(body);
        if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

        const { vehicle_id, trip_id, type, liters, cost, expense_date, notes } = body;

        // Verify vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

        // If trip_id provided, verify it exists
        if (trip_id) {
            const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get(trip_id);
            if (!trip) return NextResponse.json({ error: 'Linked trip not found' }, { status: 404 });
        }

        const result = db.prepare(
            'INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(vehicle_id, trip_id || null, type, Number(liters) || 0, Number(cost), expense_date, notes?.trim() || '');

        const expense = db.prepare(
            `SELECT e.*, v.name as vehicle_name, v.license_plate 
       FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id WHERE e.id = ?`
        ).get(result.lastInsertRowid);

        return NextResponse.json(expense, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
