import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';

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
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  let query = supabaseServer
    .from('peminjaman')
    .select('*')
    .order('request_date', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-complete expired loans where current time has passed end_date & end_time (only if end_date is specified and not '-')
  const now = new Date();
  if (data && Array.isArray(data)) {
    for (const item of data) {
      if ((item.status === 'Menunggu' || item.status === 'Disetujui') && item.end_date && item.end_date !== '-') {
        const endDateTime = parseDateTime(item.end_date, item.end_time);
        if (endDateTime && now > endDateTime) {
          // Update peminjaman status to Selesai
          await supabaseServer
            .from('peminjaman')
            .update({ status: 'Selesai' })
            .eq('id', item.id);

          // Restore car status to Tersedia
          if (item.car_id) {
            await supabaseServer.from('cars').update({ status: 'Tersedia' }).eq('id', item.car_id);
          } else if (item.plate_number) {
            await supabaseServer.from('cars').update({ status: 'Tersedia' }).eq('plate_number', item.plate_number);
          }

          item.status = 'Selesai';
        }
      }
    }
  }

  return NextResponse.json({ peminjaman: data });
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

    // Generate reservation ID: RSV-YYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = String(Math.floor(1000 + Math.random() * 8999));
    const id = `RSV-${dateStr}-${rand}`;

    // Helper to check if string is a valid UUID
    const isValidUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const safeUserId = isValidUuid(user_id) ? user_id : null;
    const safeCarId = isValidUuid(car_id) ? car_id : null;

    const { data, error } = await supabaseServer
      .from('peminjaman')
      .insert([{
        id,
        user_id: safeUserId,
        borrower_name,
        nip: nip || '',
        division: division || '',
        phone: phone || '',
        car_id: safeCarId,
        car_name,
        plate_number,
        start_date,
        start_time: start_time || '08:00',
        end_date: end_date || '-',
        end_time: end_time || '-',
        duration: duration || 'Berjalan',
        destination,
        purpose: purpose || '',
        driver_option: driver_option || 'Saya Sendiri',
        status: 'Menunggu'
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Otomatis ubah status mobil → Dipakai
    if (safeCarId) {
      await supabaseServer.from('cars').update({ status: 'Dipakai' }).eq('id', safeCarId);
    } else if (plate_number) {
      await supabaseServer.from('cars').update({ status: 'Dipakai' }).eq('plate_number', plate_number);
    }

    return NextResponse.json({ peminjaman: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
