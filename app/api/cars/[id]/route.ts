import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

// PUT update car by id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, plate_number, image, type, transmission, fuel, status, display_order } = body;

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
    addField('plate_number', plate_number);
    addField('image', image);
    addField('type', type);
    addField('transmission', transmission);
    addField('fuel', fuel);
    addField('status', status);
    addField('display_order', display_order);

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diupdate' }, { status: 400 });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE cars SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Mobil tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ car: result.rows[0] });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE car by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM cars WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
