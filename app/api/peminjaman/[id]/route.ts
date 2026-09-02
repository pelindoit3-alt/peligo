import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

// PUT update peminjaman status by id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, display_order } = body;

    // Handle display_order update (for car reordering from superadmin)
    if (display_order !== undefined) {
      const { error } = await supabaseServer
        .from('cars')
        .update({ display_order })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    const validStatuses = ['Menunggu', 'Disetujui', 'Selesai', 'Ditolak'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const updateData: Record<string, string> = { status };
    if (notes !== undefined) updateData.notes = notes;

    // Automatically record actual completion timestamp when status is set to Selesai
    if (status === 'Selesai') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');

      updateData.end_date = `${year}-${month}-${day}`;
      updateData.end_time = `${hours}:${mins}`;
    }

    const { data, error } = await supabaseServer
      .from('peminjaman')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Otomatis kembalikan status mobil → Tersedia jika peminjaman Selesai atau Ditolak
    if (status === 'Selesai' || status === 'Ditolak') {
      const pinjam = data as any;
      if (pinjam?.car_id) {
        await supabaseServer.from('cars').update({ status: 'Tersedia' }).eq('id', pinjam.car_id);
      } else if (pinjam?.plate_number) {
        await supabaseServer.from('cars').update({ status: 'Tersedia' }).eq('plate_number', pinjam.plate_number);
      }
    }

    return NextResponse.json({ peminjaman: data });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE peminjaman by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseServer.from('peminjaman').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
