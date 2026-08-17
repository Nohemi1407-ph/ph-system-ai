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
    resumen: job.resumen,
    motor: job.motor,
    proveedor: job.proveedor,
    aviso: job.aviso,
    duracion: job.duracion,
    producto: job.producto,
    costo_estimado: job.costo_estimado,
    creado: job.creado,
    tipo: job.tipo,
    videoUrl: job.videoUrl,
    duracionFinal: job.duracionFinal,
    duracionDeseada: job.duracionDeseada,
    segmentosTotales: job.segmentosTotales,
    costo_real: job.costo_real,
    variaciones: (job.variaciones || []).map((v) => ({
      id: v.id,
      idioma: v.idioma,
      estado: v.estado,
      paso: v.paso,
      mensaje: v.mensaje,
      error: v.error,
      costo: v.costo,
      costoEsCreditos: v.costoEsCreditos,
      frameUrl: v.frameUrl,
      videoUrl: v.videoUrl,
      veredicto: v.veredicto,
      plan: {
        estrategia: v.plan?.estrategia,
        familia_hook: v.plan?.familia_hook,
        angulo_venta: v.plan?.angulo_venta,
        emocion: v.plan?.emocion,
        escenario: v.plan?.escenario,
        ritmo: v.plan?.ritmo,
        hereda: v.plan?.inspirada_en?.id || null,
      },
      guion: v.guion
        ? {
            hook: v.guion.hook,
            dialogo: v.guion.dialogo,
            beats: v.guion.beats,
            caption: v.guion.caption,
            hashtags: v.guion.hashtags,
            texto_en_pantalla: v.guion.texto_en_pantalla,
            por_que_funciona: v.guion.por_que_funciona,
            cumplimiento: v.guion.cumplimiento,
          }
        : null,
    })),
  });
}
