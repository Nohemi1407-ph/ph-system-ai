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
    modelo: job.modelo,
    tarea: job.tarea,
    url: job.url,
    urls: job.urls,
    taskId: job.taskId,
    error: job.error,
    aviso: job.aviso,
    costo_estimado: job.costo_estimado,
    costo_creditos: job.costo_creditos,
  });
}
