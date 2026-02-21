import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { createToken, comparePassword } = require('@/lib/auth');

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !comparePassword(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        const token = createToken(user);
        return NextResponse.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
