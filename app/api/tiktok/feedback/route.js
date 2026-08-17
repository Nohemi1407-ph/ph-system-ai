import { NextResponse } from 'next/server';
import { registrarFeedback, tableroDesempeno, getGanadores } from '@/lib/tiktok/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tablero: qué hooks / estrategias / ángulos están vendiendo. */
export async function GET() {
  return NextResponse.json({
    tablero: tableroDesempeno(),
    ganadores: getGanadores({ limite: 5 }),
  });
}

/** Registra el resultado real de un video ya publicado en TikTok. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { jobId, variacionId, veredicto, vistas, ventas, retencion, que_funciono } = body;

  if (!jobId || !variacionId) {
    return NextResponse.json({ error: 'Faltan jobId y variacionId.' }, { status: 400 });
  }
  if (!['ganador', 'neutro', 'perdedor'].includes(veredicto)) {
    return NextResponse.json({ error: 'veredicto debe ser: ganador, neutro o perdedor.' }, { status: 400 });
  }

  const registro = registrarFeedback({
    jobId,
    variacionId,
    veredicto,
    vistas: Number(vistas) || 0,
    ventas: Number(ventas) || 0,
    retencion: Number(retencion) || 0,
    que_funciono,
  });

  return NextResponse.json({ ok: true, registro, tablero: tableroDesempeno() });
}
