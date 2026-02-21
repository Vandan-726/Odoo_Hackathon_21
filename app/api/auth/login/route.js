import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { comparePassword, createToken } = require('@/lib/auth');

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const db = await getDb();
        const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = res.rows[0];

        if (!user || !comparePassword(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = createToken(user);
        return NextResponse.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
