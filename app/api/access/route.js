import { NextResponse } from 'next/server';

const ACCESS_CODE = '1407';

export async function POST(request) {
  const { code } = await request.json();

  if (code !== ACCESS_CODE) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('ph_access', '1407_granted', {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    sameSite: 'lax',
  });
  return response;
}
