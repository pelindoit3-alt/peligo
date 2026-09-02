import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

// DELETE user by id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Prevent deleting Superadmin
    const { data: user } = await supabaseServer.from('users').select('role').eq('id', id).single();
    if (user?.role === 'Superadmin') {
      return NextResponse.json({ error: 'Superadmin tidak bisa dihapus' }, { status: 403 });
    }
    const { error } = await supabaseServer.from('users').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (division !== undefined) updateData.division = division;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (password_hash !== undefined) updateData.password_hash = password_hash;

    const { data, error } = await supabaseServer
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, nip, division, phone, role, status')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
