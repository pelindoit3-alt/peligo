import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';

// GET all cars ordered by display_order
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY display_order ASC');
    return NextResponse.json({ cars: result.rows });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST create new car
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, plate_number, image, type, transmission, fuel, status } = body;

    if (!name || !plate_number) {
      return NextResponse.json({ error: 'Nama dan nomor plat wajib diisi' }, { status: 400 });
    }

    const maxResult = await pool.query(
      'SELECT display_order FROM cars ORDER BY display_order DESC LIMIT 1'
    );
    const nextOrder = (maxResult.rows[0]?.display_order ?? 0) + 1;

    const result = await pool.query(
      `INSERT INTO cars (name, plate_number, image, type, transmission, fuel, status, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        plate_number,
        image || '',
        type || 'SUV',
        transmission || 'Automatic',
        fuel || 'Bensin',
        status || 'Tersedia',
        nextOrder,
      ]
    );

    return NextResponse.json({ car: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
