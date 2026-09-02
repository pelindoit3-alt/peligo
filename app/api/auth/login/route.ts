import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const cleanUser = username.trim();

    const { data, error } = await supabaseServer
      .from('users')
      .select('id, username, name, nip, division, phone, role, status')
      .or(`username.ilike.${cleanUser},division.ilike.${cleanUser},username.ilike.staff_${cleanUser}`)
      .eq('password_hash', password)
      .eq('status', 'Aktif')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
