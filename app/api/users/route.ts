import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';

// GET all users
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, username, name, nip, division, phone, role, status, created_at
       FROM users ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password_hash, name, nip, division, phone, role } = body;

    if (!username || !password_hash || !role) {
      return NextResponse.json({ error: 'Username, password, dan role wajib diisi' }, { status: 400 });
    }

    const validRoles = ['Staff', 'Admin', 'Superadmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, name, nip, division, phone, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Aktif')
       RETURNING id, username, name, nip, division, phone, role, status, created_at`,
      [
        username,
        password_hash,
        name || username,
        nip || '',
        division || '',
        phone || '',
        role,
      ]
    );

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
