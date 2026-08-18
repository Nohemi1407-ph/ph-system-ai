import { NextResponse } from 'next/server';
import { codigoEsperado, usandoCodigoPublico, firmaDeAcceso, igualSeguro } from '@/lib/acceso';

export const runtime = 'nodejs';

export async function POST(request) {
  let code;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  }

  if (usandoCodigoPublico()) {
    console.warn(
      '[Acceso] PH_ACCESS_CODE no está configurada: se usa el código por defecto, que es público porque está en el repositorio. Configúrala en Railway.'
    );
  }

  if (!igualSeguro(code || '', codigoEsperado())) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('ph_access', await firmaDeAcceso(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    sameSite: 'lax',
  });
  return response;
}
