import { NextResponse } from 'next/server';
import { resolverLlave } from '@/lib/tiktok/providers/kie';
import { crearJob } from '@/lib/tiktok/store';
import { generarAnuncio, costoEstimado, clipsNecesarios } from '@/lib/marketing/engine';
import { clasificar, statusHttp } from '@/lib/tiktok/errors';
import { verificarSaldo } from '@/lib/tiktok/creditos';

export const runtime = 'nodejs';
export const maxDuration = 800;

function nuevoId() {
  return `mkt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request) {
  const apiKey = resolverLlave(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta la API key de Kie.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const {
    prompt,
    aspect_ratio: ratio = '9:16',
    resolution: resolucion = '1080p',
    duration: duracion = 5,
    images_list: imagenes = [],
    video_files: videos = [],
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Falta el guion del anuncio.' }, { status: 400 });
  }
  if (!imagenes.length) {
    return NextResponse.json({ error: 'Falta al menos la imagen del producto.' }, { status: 400 });
  }

  const segundos = Math.max(1, Math.min(15, Number(duracion) || 5));

  // Pre-vuelo antes de crear el job: si no alcanza el saldo, el cliente se
  // entera ahora con un 402 y no con un trabajo que muere a mitad.
  try {
    await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costoEstimado({ duracion: segundos, resolucion }),
      etiqueta: `un anuncio de ${segundos}s`,
    });
  } catch (e) {
    const err = clasificar(e);
    return NextResponse.json({ error: err.message, ...err.aJSON() }, { status: statusHttp(err.codigo) });
  }

  const jobId = nuevoId();
  crearJob({
    id: jobId,
    tipo: 'marketing',
    estado: 'en_cola',
    mensaje: 'En cola…',
    prompt,
    ratio,
    resolucion,
    duracion: segundos,
    clips_previstos: clipsNecesarios(segundos),
    costo_estimado: costoEstimado({ duracion: segundos, resolucion }),
  });

  // Fire-and-forget: el anuncio sigue generándose aunque se cierre la pestaña.
  generarAnuncio(jobId, {
    apiKey,
    prompt,
    ratio,
    resolucion,
    duracion: segundos,
    imagenes,
    videos,
  }).catch((e) => console.error('[Marketing] generarAnuncio:', e.message));

  return NextResponse.json({
    jobId,
    estado: 'en_cola',
    clips_previstos: clipsNecesarios(segundos),
    costo_estimado: costoEstimado({ duracion: segundos, resolucion }),
  });
}
