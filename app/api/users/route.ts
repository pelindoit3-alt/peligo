import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';

// GET all users
export async function GET() {
  const { data, error } = await supabaseServer
    .from('users')
    .select('id, username, name, nip, division, phone, role, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password_hash, name, nip, division, phone, role } = body;

    if (!username || !password_hash || !role) {
      return NextResponse.json({ error: 'Username, password, dan role wajib diisi' }, { status: 400 });
    }

    const validRoles = ['Staff', 'Admin', 'Superadmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('users')
      .insert([{
        username,
        password_hash,
        name: name || username,
        nip: nip || '',
        division: division || '',
        phone: phone || '',
        role,
        status: 'Aktif'
      }])
      .select('id, username, name, nip, division, phone, role, status, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
