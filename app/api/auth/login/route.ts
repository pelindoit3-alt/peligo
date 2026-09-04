import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const cleanUser = username.trim();

    const result = await pool.query(
      `SELECT id, username, name, nip, division, phone, role, status
       FROM users
       WHERE (username ILIKE $1 OR division ILIKE $1 OR username ILIKE $2)
         AND password_hash = $3
         AND status = 'Aktif'
       LIMIT 1`,
      [cleanUser, `staff_${cleanUser}`, password]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
