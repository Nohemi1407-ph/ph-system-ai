import { NextResponse } from 'next/server';
import { resolverLlave } from '@/lib/tiktok/providers/kie';
import { crearJob } from '@/lib/tiktok/store';
import { correrJob, costeAproximado } from '@/lib/kie/motor';
import { porId } from '@/lib/kie/catalogo';
import { verificarSaldo } from '@/lib/tiktok/creditos';
import { clasificar, statusHttp } from '@/lib/tiktok/errors';

export const runtime = 'nodejs';
export const maxDuration = 800;

function nuevoId() {
  return `kie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request) {
  const apiKey = resolverLlave(request);
  if (!apiKey) return NextResponse.json({ error: 'Falta la API key de Kie.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { modelo: modeloId, params = {} } = body;
  const modelo = porId(modeloId);

  if (!modelo) {
    return NextResponse.json({ error: `Modelo desconocido: ${modeloId}.` }, { status: 400 });
  }
  if (!params.prompt?.trim() && modelo.tarea !== 'lipsync') {
    return NextResponse.json({ error: 'Falta el prompt.' }, { status: 400 });
  }

  // Pre-vuelo: si no alcanza el saldo, se dice ahora y no a mitad del trabajo.
  try {
    await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costeAproximado(modeloId),
      etiqueta: modelo.name,
    });
  } catch (e) {
    const err = clasificar(e);
    return NextResponse.json({ error: err.message, ...err.aJSON() }, { status: statusHttp(err.codigo) });
  }

  const jobId = nuevoId();
  crearJob({
    id: jobId,
    tipo: 'kie',
    estado: 'en_cola',
    mensaje: 'En cola…',
    modelo: modeloId,
    tarea: modelo.tarea,
    costo_estimado: costeAproximado(modeloId),
  });

  // Fire-and-forget: el trabajo sigue aunque se cierre la pestaña.
  correrJob(jobId, { modeloId, params, apiKey }).catch((e) =>
    console.error('[Kie] correrJob:', e.message)
  );

  return NextResponse.json({ jobId, estado: 'en_cola', costo_estimado: costeAproximado(modeloId) });
}
