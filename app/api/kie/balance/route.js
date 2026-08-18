import { NextResponse } from 'next/server';
import { resolverLlave } from '@/lib/tiktok/providers/kie';
import { saldoActual } from '@/lib/tiktok/creditos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El saldo se lee en el servidor: la llave de Kie nunca sale al navegador.
export async function GET(request) {
  const apiKey = resolverLlave(request);
  if (!apiKey) return NextResponse.json({ error: 'Falta la API key de Kie.' }, { status: 401 });

  const creditos = await saldoActual({ apiKey, proveedor: 'kie' });
  return NextResponse.json({ creditos });
}
