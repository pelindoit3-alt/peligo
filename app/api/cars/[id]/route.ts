import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

// PUT update car by id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, plate_number, image, type, transmission, fuel, status, display_order } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (plate_number !== undefined) updateData.plate_number = plate_number;
    if (image !== undefined) updateData.image = image;
    if (type !== undefined) updateData.type = type;
    if (transmission !== undefined) updateData.transmission = transmission;
    if (fuel !== undefined) updateData.fuel = fuel;
    if (status !== undefined) updateData.status = status;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data, error } = await supabaseServer
      .from('cars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ car: data });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE car by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseServer.from('cars').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
