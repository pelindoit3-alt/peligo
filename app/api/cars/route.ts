import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';

// GET all cars ordered by display_order
export async function GET() {
  const { data, error } = await supabaseServer
    .from('cars')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cars: data });
}

// POST create new car
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, plate_number, image, type, transmission, fuel, status } = body;

    if (!name || !plate_number) {
      return NextResponse.json({ error: 'Nama dan nomor plat wajib diisi' }, { status: 400 });
    }

    // Get current max display_order
    const { data: maxData } = await supabaseServer
      .from('cars')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxData?.display_order ?? 0) + 1;

    const { data, error } = await supabaseServer
      .from('cars')
      .insert([{ name, plate_number, image: image || '', type: type || 'SUV', transmission: transmission || 'Automatic', fuel: fuel || 'Bensin', status: status || 'Tersedia', display_order: nextOrder }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ car: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
