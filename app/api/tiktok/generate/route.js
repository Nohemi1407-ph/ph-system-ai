import { NextResponse } from 'next/server';
import { llaveDe } from '@/lib/tiktok/providers';
import { crearJob, listarJobs } from '@/lib/tiktok/store';
import { correrLote } from '@/lib/tiktok/pipeline';
import { getMotor, costoLote, MOTOR_DEFAULT } from '@/lib/tiktok/engines';
import { construirPlanDeVariaciones, resumirPlan } from '@/lib/tiktok/variants';
import { llmConfigurado } from '@/lib/tiktok/llm';
import { verificarSaldo } from '@/lib/tiktok/creditos';
import { clasificar, statusHttp } from '@/lib/tiktok/errors';

export const runtime = 'nodejs';
export const maxDuration = 300;

function nuevoId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  return NextResponse.json({ jobs: listarJobs({ limite: 20 }) });
}

export async function POST(request) {
  if (!llmConfigurado()) {
    return NextResponse.json(
      { error: 'Falta la llave del modelo de texto (KIE_API_KEY, ANTHROPIC_API_KEY u OPENAI_API_KEY).' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const {
    avatarUrl,
    productoUrl,
    producto = {},
    avatar = {},
    cantidad = 4,
    motor = MOTOR_DEFAULT,
    duracion,
    idioma = 'es',
    estrategias,
    seed,
    iterar = false,
    soloPlan = false,
  } = body;

  if (!avatarUrl) return NextResponse.json({ error: 'Falta la imagen del avatar.' }, { status: 400 });
  if (!productoUrl && !producto.descripcion) {
    return NextResponse.json(
      { error: 'Falta la imagen del producto o al menos su descripción.' },
      { status: 400 }
    );
  }

  const motorInfo = getMotor(motor);
  const n = Math.max(1, Math.min(10, Number(cantidad) || 4));
  const semilla = Number(seed) || Date.now();
  const dur = motorInfo.video.duraciones.includes(Number(duracion))
    ? Number(duracion)
    : motorInfo.video.duracionDefault;

  // Vista previa del lote sin gastar un centavo.
  if (soloPlan) {
    const plan = construirPlanDeVariaciones({ n, seed: semilla, estrategias });
    return NextResponse.json({
      plan: resumirPlan(plan),
      seed: semilla,
      costo_estimado: costoLote(motor, n),
      duracion: dur,
    });
  }

  // Llave del proveedor que usa este motor
  const apiKey = llaveDe(motorInfo.proveedor, request);
  if (!apiKey) {
    return NextResponse.json(
      { error: `Falta la API key de ${motorInfo.proveedor}. Configúrala en las variables de entorno.` },
      { status: 401 }
    );
  }

  // Pre-vuelo de saldo: un lote a medias es peor que un lote que no arranca.
  let saldo = null;
  try {
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: motorInfo.proveedor,
      costoEstimadoUsd: costoLote(motor, n),
      etiqueta: `un lote de ${n} videos`,
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
    mensaje: 'En cola…',
    motor,
    proveedor: motorInfo.proveedor,
    duracion: dur,
    idioma,
    seed: semilla,
    avatarUrl,
    productoUrl,
    producto,
    costo_estimado: costoLote(motor, n),
    variaciones: [],
  });

  // Fire-and-forget: el lote sigue corriendo aunque el usuario cierre la pestaña.
  correrLote(jobId, {
    apiKey,
    avatarUrl,
    productoUrl,
    producto,
    avatar,
    cantidad: n,
    motorId: motor,
    duracion: dur,
    idioma,
    estrategias,
    seed: semilla,
    iterar,
  }).catch((e) => console.error('[PH TikTok] correrLote:', e));

  return NextResponse.json({ jobId, estado: 'en_cola', costo_estimado: costoLote(motor, n), saldo });
}
