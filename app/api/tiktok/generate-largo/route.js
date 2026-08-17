import { NextResponse } from 'next/server';
import { resolverLlave } from '@/lib/tiktok/providers/kie';
import { crearJob } from '@/lib/tiktok/store';
import { correrVideoLargo, calcularClips, costoVideoLargo } from '@/lib/tiktok/longform';
import { verificarSaldo } from '@/lib/tiktok/creditos';
import { clasificar, statusHttp } from '@/lib/tiktok/errors';

export const runtime = 'nodejs';
export const maxDuration = 800;

function nuevoId() {
  return `joblargo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const { avatarUrl, productoUrl, producto = {}, duracionDeseadaSeg = 30, idioma = 'es' } = body;

  if (!avatarUrl) return NextResponse.json({ error: 'Falta la imagen del avatar.' }, { status: 400 });
  if (!productoUrl && !producto.descripcion) {
    return NextResponse.json({ error: 'Falta la imagen del producto o al menos su descripcion.' }, { status: 400 });
  }

  const { duracionFinal, segmentosTotales } = calcularClips(duracionDeseadaSeg);

  // Pre-vuelo de saldo antes de crear el job: si no alcanza, el cliente se entera
  // ahora con un 402 y no con un job que muere a mitad de camino.
  let saldo = null;
  try {
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costoVideoLargo(duracionDeseadaSeg),
      etiqueta: `un video de ${duracionFinal}s (${segmentosTotales} clips)`,
    });
    saldo = preVuelo.saldo;
  } catch (e) {
    const err = clasificar(e);
    return NextResponse.json({ error: err.message, ...err.aJSON() }, { status: statusHttp(err.codigo) });
  }

  const jobId = nuevoId();

  crearJob({
    id: jobId,
    estado: 'en_cola',
    mensaje: 'En cola...',
    tipo: 'largo',
    duracionDeseada: Number(duracionDeseadaSeg),
    duracionFinal,
    segmentosTotales,
    costo_estimado: costoVideoLargo(duracionDeseadaSeg),
    variaciones: [],
  });

  correrVideoLargo(jobId, { apiKey, avatarUrl, productoUrl, producto, duracionDeseadaSeg, idioma }).catch((e) =>
    console.error('[PH TikTok] correrVideoLargo:', e)
  );

  return NextResponse.json({
    jobId,
    estado: 'en_cola',
    duracionFinal,
    segmentosTotales,
    costo_estimado: costoVideoLargo(duracionDeseadaSeg),
    saldo,
  });
}