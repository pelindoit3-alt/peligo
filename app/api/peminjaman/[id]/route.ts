import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

// PUT update peminjaman status by id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, display_order } = body;

    // Handle display_order update (for car reordering from superadmin)
    if (display_order !== undefined) {
      await pool.query('UPDATE cars SET display_order = $1 WHERE id = $2', [display_order, id]);
      return NextResponse.json({ success: true });
    }

    const validStatuses = ['Menunggu', 'Disetujui', 'Selesai', 'Ditolak'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const fields: string[] = ['status = $1'];
    const values: unknown[] = [status];
    let idx = 2;

    if (notes !== undefined) {
      fields.push(`notes = $${idx}`);
      values.push(notes);
      idx++;
    }

    if (status === 'Selesai') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');

      fields.push(`end_date = $${idx}`);
      values.push(`${year}-${month}-${day}`);
      idx++;

      fields.push(`end_time = $${idx}`);
      values.push(`${hours}:${mins}`);
      idx++;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE peminjaman SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Peminjaman tidak ditemukan' }, { status: 404 });
    }

    const pinjam = result.rows[0];

    if (status === 'Selesai' || status === 'Ditolak') {
      if (pinjam.car_id) {
        await pool.query('UPDATE cars SET status = $1 WHERE id = $2', ['Tersedia', pinjam.car_id]);
      } else if (pinjam.plate_number) {
        await pool.query('UPDATE cars SET status = $1 WHERE plate_number = $2', ['Tersedia', pinjam.plate_number]);
      }
    }

    return NextResponse.json({ peminjaman: pinjam });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE peminjaman by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM peminjaman WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
