/**
 * MOTOR GENERICO DE KIE
 * -----------------------------------------------------------------------------
 * Un solo camino para todo lo que genera el software: imagen, video, lip sync y
 * video a video. El catalogo dice que modelo y que input; esto lo ejecuta.
 *
 * Kie tiene dos familias de endpoint y aqui se unifican:
 *   market  POST /api/v1/jobs/createTask   (la mayoria de modelos)
 *   veo     POST /api/v1/veo/generate      (Veo 3.1, con su propio formato)
 *
 * Reutiliza el proveedor que ya estaba probado en el motor de TikTok, asi que
 * hereda el sondeo adaptativo, los errores tipados y el taskId recuperable.
 */

import { crearTarea, generarVideo } from '../tiktok/providers/kie.js';
import { porId } from './catalogo.js';
import { ErrorVideo, CODIGOS, clasificar } from '../tiktok/errors.js';
import { verificarSaldo } from '../tiktok/creditos.js';
import { actualizarJob } from '../tiktok/store.js';

/**
 * Ejecuta un modelo del catalogo.
 *
 * @param {Object} p
 * @param {string} p.modeloId  id del catalogo (no el id de Kie)
 * @param {Object} p.params    lo que mando la interfaz
 * @param {string} p.apiKey
 * @param {(taskId: string) => void} [p.onTask]
 * @returns {Promise<{urls: string[], url: string, taskId: string, creditos: number|null}>}
 */
export async function ejecutar({ modeloId, params = {}, apiKey, onTask }) {
  const modelo = porId(modeloId);
  if (!modelo) {
    throw new ErrorVideo(CODIGOS.PROVIDER_ERROR, `Modelo desconocido: ${modeloId}.`);
  }

  const input = modelo.construir(params);

  // Veo tiene endpoint y formato propios: prompt + imagenes de referencia.
  if (modelo.endpoint === 'veo') {
    const r = await generarVideo(
      {
        modelo: modelo.modelo,
        modo: modelo.modo,
        prompt: input.prompt,
        imagenes: input.imagenes || [],
        aspect_ratio: input.aspect_ratio,
      },
      apiKey,
      { onRequestId: onTask }
    );
    return { urls: r.urls || [r.url], url: r.url, taskId: r.requestId, creditos: r.creditos };
  }

  // Resto del mercado: mismo protocolo para imagen, video, lip sync y v2v.
  // Solo cambian el modelo y el input, que ya vienen resueltos por el catalogo.
  const r = await crearTarea({ modelo: modelo.modelo, input }, apiKey, { onRequestId: onTask });

  return { urls: r.urls || [r.url], url: r.url, taskId: r.requestId, creditos: r.creditos };
}

/** Coste estimado por tarea, para el pre-vuelo. Son ordenes de magnitud. */
const COSTE_APROX = { t2i: 0.05, i2i: 0.05, t2v: 0.4, i2v: 0.4, v2v: 0.4, lipsync: 0.2 };

export function costeAproximado(modeloId) {
  const m = porId(modeloId);
  if (!m) return 0.4;
  if (m.modelo === 'veo3') return 1.6;
  return COSTE_APROX[m.tarea] ?? 0.4;
}

/**
 * Corre una generacion como job en segundo plano, para que la interfaz sondee
 * en vez de mantener una peticion abierta durante minutos.
 */
export async function correrJob(jobId, { modeloId, params, apiKey }) {
  try {
    const modelo = porId(modeloId);

    actualizarJob(jobId, { estado: 'generando', mensaje: 'Revisando saldo...' });
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costeAproximado(modeloId),
      etiqueta: modelo?.name || modeloId,
    });

    actualizarJob(jobId, {
      saldo_previo: preVuelo.saldo,
      mensaje: `Generando con ${modelo?.name || modeloId}...`,
    });

    const r = await ejecutar({
      modeloId,
      params,
      apiKey,
      onTask: (taskId) => actualizarJob(jobId, { taskId }),
    });

    actualizarJob(jobId, {
      estado: 'terminado',
      mensaje: 'Listo.',
      url: r.url,
      urls: r.urls,
      taskId: r.taskId,
      costo_creditos: r.creditos,
      aviso: 'Descarga el resultado hoy: las URLs del proveedor caducan.',
    });

    return r;
  } catch (e) {
    const err = clasificar(e);
    console.error(`[Kie] ${modeloId} fallo (${err.codigo}):`, err.message);
    actualizarJob(jobId, {
      estado: 'error',
      mensaje: err.message,
      error: err.aJSON(),
    });
    throw err;
  }
}
