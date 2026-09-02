import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';

// POST execute raw SQL via service role (Superadmin SQL Editor)
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query SQL wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.rpc('exec_sql', { sql: query });

    if (error) {
      // Fallback: try direct query for SELECT statements
      const trimmed = query.trim().toUpperCase();
      if (trimmed.startsWith('SELECT')) {
        return NextResponse.json({
          error: 'Gunakan Supabase SQL Editor di dashboard untuk SELECT kompleks. Error: ' + error.message
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data, success: true });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
