import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';

function parseDateTime(dateStr: string, timeStr: string = '17:00'): Date | null {
  if (!dateStr || dateStr.trim() === '-' || dateStr === 'undefined' || dateStr === 'null') return null;
  try {
    let formattedDate = dateStr.trim();
    if (formattedDate.includes('/')) {
      const parts = formattedDate.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    const time = timeStr && timeStr !== '-' ? timeStr.trim() : '17:00';
    const isoString = `${formattedDate}T${time}:00`;
    const parsed = new Date(isoString);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

// GET all peminjaman (optionally filter by user_id) with automatic loan auto-completion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let result;
    if (userId) {
      result = await pool.query(
        'SELECT * FROM peminjaman WHERE user_id = $1 ORDER BY request_date DESC',
        [userId]
      );
    } else {
      result = await pool.query('SELECT * FROM peminjaman ORDER BY request_date DESC');
    }

    const data = result.rows;
    const now = new Date();

    for (const item of data) {
      if ((item.status === 'Menunggu' || item.status === 'Disetujui') && item.end_date && item.end_date !== '-') {
        const endDateTime = parseDateTime(item.end_date, item.end_time);
        if (endDateTime && now > endDateTime) {
          await pool.query('UPDATE peminjaman SET status = $1 WHERE id = $2', ['Selesai', item.id]);

          if (item.car_id) {
            await pool.query('UPDATE cars SET status = $1 WHERE id = $2', ['Tersedia', item.car_id]);
          } else if (item.plate_number) {
            await pool.query('UPDATE cars SET status = $1 WHERE plate_number = $2', ['Tersedia', item.plate_number]);
          }

          item.status = 'Selesai';
        }
      }
    }

    return NextResponse.json({ peminjaman: data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST create new peminjaman
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      borrower_name,
      nip,
      division,
      phone,
      car_id,
      car_name,
      plate_number,
      start_date,
      start_time,
      end_date,
      end_time,
      duration,
      destination,
      purpose,
      driver_option
    } = body;

    if (!borrower_name || !car_name || !plate_number || !start_date || !destination) {
      return NextResponse.json({ error: 'Data peminjaman tidak lengkap' }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = String(Math.floor(1000 + Math.random() * 8999));
    const id = `RSV-${dateStr}-${rand}`;

    const isValidUuid = (val: unknown) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const safeUserId = isValidUuid(user_id) ? user_id : null;
    const safeCarId = isValidUuid(car_id) ? car_id : null;

    const result = await pool.query(
      `INSERT INTO peminjaman
        (id, user_id, borrower_name, nip, division, phone, car_id, car_name, plate_number,
         start_date, start_time, end_date, end_time, duration, destination, purpose, driver_option, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Menunggu')
       RETURNING *`,
      [
        id,
        safeUserId,
        borrower_name,
        nip || '',
        division || '',
        phone || '',
        safeCarId,
        car_name,
        plate_number,
        start_date,
        start_time || '08:00',
        end_date || '-',
        end_time || '-',
        duration || 'Berjalan',
        destination,
        purpose || '',
        driver_option || 'Saya Sendiri',
      ]
    );

    if (safeCarId) {
      await pool.query('UPDATE cars SET status = $1 WHERE id = $2', ['Dipakai', safeCarId]);
    } else if (plate_number) {
      await pool.query('UPDATE cars SET status = $1 WHERE plate_number = $2', ['Dipakai', plate_number]);
    }

    return NextResponse.json({ peminjaman: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE clear all peminjaman history or by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM peminjaman WHERE id = $1', [id]);
      return NextResponse.json({ success: true, message: 'Data riwayat berhasil dihapus' });
    }

    // Delete all records from peminjaman table
    await pool.query('DELETE FROM peminjaman');
    // Restore status of all cars to Tersedia
    await pool.query("UPDATE cars SET status = 'Tersedia'");

    return NextResponse.json({ success: true, message: 'Seluruh isi riwayat peminjaman berhasil dibersihkan' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
