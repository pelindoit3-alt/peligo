import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

// DELETE user by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userResult.rows[0]?.role === 'Superadmin') {
      return NextResponse.json({ error: 'Superadmin tidak bisa dihapus' }, { status: 403 });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// PUT update user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, division, phone, role, status, password_hash } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const addField = (key: string, value: unknown) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    };

    addField('name', name);
    addField('division', division);
    addField('phone', phone);
    addField('role', role);
    addField('status', status);
    addField('password_hash', password_hash);

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diupdate' }, { status: 400 });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, username, name, nip, division, phone, role, status`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
