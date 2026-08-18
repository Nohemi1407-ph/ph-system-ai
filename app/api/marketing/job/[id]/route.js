import { NextResponse } from 'next/server';
import { getJob } from '@/lib/tiktok/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job no encontrado.' }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    estado: job.estado,
    mensaje: job.mensaje,
    url: job.url,
    clips: job.clips,
    duracion: job.duracion,
    ratio: job.ratio,
    resolucion: job.resolucion,
    clips_previstos: job.clips_previstos,
    costo_estimado: job.costo_estimado,
    costo_real: job.costo_real,
    costo_creditos: job.costo_creditos,
    error: job.error,
    aviso: job.aviso,
    creado: job.creado,
  });
}
