/**
 * PH TikTok Shop Engine — PROVEEDOR KIE.AI
 * -----------------------------------------------------------------------------
 * Endpoints usados (verificados en docs.kie.ai):
 *   Subida    POST https://kieai.redpandaai.co/api/file-base64-upload
 *   Veo 3.1   POST https://api.kie.ai/api/v1/veo/generate
 *             GET  https://api.kie.ai/api/v1/veo/record-info?taskId=
 *   Market    POST https://api.kie.ai/api/v1/jobs/createTask
 *             GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=
 *   Créditos  GET  https://api.kie.ai/api/v1/chat/credit
 *
 * Lo importante: Veo 3.1 en Kie soporta REFERENCE_2_VIDEO, que acepta
 * avatar + producto como imágenes de referencia y devuelve el video 9:16
 * con audio directamente. Eso nos ahorra el paso de armar el frame maestro.
 *
 * OJO: los archivos y las URLs de resultado de Kie caducan (24 h – 3 días).
 * Por eso el pipeline descarga y re-hospeda lo que hay que conservar.
 */

import { ErrorVideo, CODIGOS, clasificar } from '../errors.js';

const API = process.env.KIE_BASE_URL || 'https://api.kie.ai';
const UPLOAD = process.env.KIE_UPLOAD_URL || 'https://kieai.redpandaai.co';

export const capacidades = {
  referenciaDirecta: true, // puede ir de avatar+producto → video sin frame intermedio
  reportaCreditos: true,
};

function cabeceras(apiKey) {
  return { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
}

async function pedir(url, opts, apiKey) {
  const res = await fetch(url, { ...opts, headers: { ...cabeceras(apiKey), ...(opts.headers || {}) } });
  const txt = await res.text();

  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new Error(`Kie devolvió una respuesta no-JSON (${res.status}): ${txt.slice(0, 200)}`);
  }

  if (!res.ok || (data.code && data.code !== 200 && data.success !== true)) {
    throw new Error(`Kie ${res.status} · ${data.msg || data.message || txt.slice(0, 200)}`);
  }
  return data;
}

/**
 * Lee la URL de salida sin importar en qué forma la devuelva Kie.
 * Cubre: resultJson (string), response.resultUrls, resultUrls, info.resultUrls.
 */
function extraerUrls(data = {}) {
  const candidatos = [];

  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) candidatos.push(...v.filter((x) => typeof x === 'string'));
    else if (typeof v === 'string') candidatos.push(v);
  };

  push(data.resultUrls);
  push(data.response?.resultUrls);
  push(data.info?.resultUrls);
  push(data.response?.resultUrl);
  push(data.videoUrl);
  push(data.response?.videoUrl);

  if (typeof data.resultJson === 'string') {
    try {
      const parsed = JSON.parse(data.resultJson);
      push(parsed.resultUrls);
      push(parsed.resultUrl);
      push(parsed.videoUrl);
    } catch {
      /* ignorar */
    }
  }
  return candidatos;
}

const ESTADOS_OK = ['success', 'completed', 'succeeded'];
const ESTADOS_FALLO = ['fail', 'failed', 'error'];

function leerEstado(data = {}) {
  // La API de Market usa `state`; la de Veo usa `successFlag` (0 pendiente, 1 ok, 2/3 fallo).
  if (data.state) return String(data.state).toLowerCase();
  if (data.successFlag === 1) return 'success';
  if (data.successFlag === 2 || data.successFlag === 3) return 'fail';
  if (data.successFlag === 0) return 'generating';
  return 'generating';
}

/**
 * Sondeo adaptativo: rápido al principio (las tareas cortas terminan en
 * segundos y no queremos esperar de más) y más espaciado después, para no
 * martillar la API durante los minutos largos de un video.
 */
function intervaloAdaptativo(intento) {
  if (intento <= 4) return 1500;
  if (intento <= 10) return 2500;
  return 4000;
}

async function esperar(url, apiKey, { intentos = 300, intervalo = 3000, onTick, taskId = null } = {}) {
  // El presupuesto total de espera se mantiene igual que con el sondeo fijo:
  // cambia el ritmo, no cuánto se aguanta.
  const tiempoMaxMs = intentos * intervalo;
  const limite = Date.now() + tiempoMaxMs;

  let ultimo = null;
  let intento = 0;

  while (Date.now() < limite) {
    intento++;
    await new Promise((r) => setTimeout(r, intervaloAdaptativo(intento)));

    let data;
    try {
      data = (await pedir(url, { method: 'GET' }, apiKey)).data || {};
    } catch (e) {
      if (Date.now() >= limite) throw new ErrorVideo(CODIGOS.PROVIDER_ERROR, e.message, { taskId });
      continue;
    }

    ultimo = data;
    const estado = leerEstado(data);
    onTick?.({ intento, estado, progreso: data.progress });

    if (ESTADOS_OK.includes(estado)) {
      const urls = extraerUrls(data);
      if (!urls.length) {
        throw new ErrorVideo(CODIGOS.PROVIDER_ERROR, 'Kie marcó la tarea como lista pero no devolvió URL.', { taskId });
      }
      return { url: urls[0], urls, creditos: data.creditsConsumed ?? null };
    }
    if (ESTADOS_FALLO.includes(estado)) {
      const detalle = data.failMsg || data.errorMessage || data.failCode || 'sin detalle';
      throw clasificar(new Error(`Kie falló: ${detalle} | data completa: ${JSON.stringify(data)}`), { taskId });
    }
  }

  // El taskId viaja en el error: si Kie ya cobró, es lo único que permite recuperar el video.
  throw new ErrorVideo(
    CODIGOS.TIMEOUT,
    `Tiempo de espera agotado en Kie tras ${Math.round(tiempoMaxMs / 1000)}s. Último estado: ${leerEstado(ultimo || {})}`,
    { taskId }
  );
}

// ─── Subida de archivos ──────────────────────────────────────────────────────

export async function subirArchivo(file, apiKey) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'image/png';
  const nombre = (file.name || `ph-${Date.now()}.png`).replace(/[^\w.\-]/g, '_');

  const data = await pedir(
    `${UPLOAD}/api/file-base64-upload`,
    {
      method: 'POST',
      body: JSON.stringify({
        base64Data: `data:${mime};base64,${buffer.toString('base64')}`,
        uploadPath: 'ph-tiktok',
        fileName: nombre,
      }),
    },
    apiKey
  );

  const url = data.data?.downloadUrl || data.data?.fileUrl;
  if (!url) throw new Error('Kie no devolvió la URL del archivo subido.');
  return url;
}

// ─── Imagen (frame maestro) — Market: google/nano-banana-edit ────────────────

export async function generarFrame({ modelo = 'google/nano-banana-edit', prompt, imagenes, aspect_ratio = '9:16' }, apiKey, opts) {
  const creado = await pedir(
    `${API}/api/v1/jobs/createTask`,
    {
      method: 'POST',
      body: JSON.stringify({
        model: modelo,
        input: { prompt, image_urls: imagenes, aspect_ratio, output_format: 'png' },
      }),
    },
    apiKey
  );

  const taskId = creado.data?.taskId;
  if (!taskId) throw new Error('Kie no devolvió taskId para la imagen.');
  opts?.onRequestId?.(taskId);

  const r = await esperar(`${API}/api/v1/jobs/recordInfo?taskId=${taskId}`, apiKey, {
    intentos: 100,
    intervalo: 3000,
    ...opts,
    taskId,
  });
  return { ...r, requestId: taskId };
}

// ─── Video — Veo 3.1 ─────────────────────────────────────────────────────────

/**
 * @param {Object} p
 * @param {string} p.modelo    veo3_fast | veo3 | veo3_lite
 * @param {string} p.modo      REFERENCE_2_VIDEO (avatar+producto) | null (frame único)
 * @param {string[]} p.imagenes URLs de referencia o [frameUrl]
 */
export async function generarVideo({ modelo = 'veo3_fast', modo, prompt, imagenes = [], aspect_ratio = '9:16' }, apiKey, opts) {
  const payload = {
    prompt,
    imageUrls: imagenes,
    model: modelo,
    aspect_ratio,
    enableTranslation: false, // los prompts ya van en inglés; el diálogo va literal
    enableFallback: true,
  };
  if (modo) payload.generationType = modo;

  const creado = await pedir(`${API}/api/v1/veo/generate`, { method: 'POST', body: JSON.stringify(payload) }, apiKey);

  const taskId = creado.data?.taskId;
  if (!taskId) throw new Error('Kie no devolvió taskId para el video.');
  opts?.onRequestId?.(taskId);

  const r = await esperar(`${API}/api/v1/veo/record-info?taskId=${taskId}`, apiKey, {
    intentos: 300,
    intervalo: 3000,
    ...opts,
    taskId,
  });
  return { ...r, requestId: taskId };
}

export async function extenderVideo({ taskId, prompt, modelo = 'fast' }, apiKey, opts) {
  const payload = { taskId, prompt, model: modelo };
  const creado = await pedir(`${API}/api/v1/veo/extend`, { method: 'POST', body: JSON.stringify(payload) }, apiKey);
  const nuevoTaskId = creado.data?.taskId;
  if (!nuevoTaskId) throw new Error('Kie no devolvio taskId para el extend.');
  opts?.onRequestId?.(nuevoTaskId);
  const r = await esperar(`${API}/api/v1/veo/record-info?taskId=${nuevoTaskId}`, apiKey, {
    intentos: 300,
    intervalo: 3000,
    ...opts,
    taskId: nuevoTaskId,
  });
  return { ...r, requestId: nuevoTaskId };
}

// ─── Créditos ────────────────────────────────────────────────────────────────

export async function saldo(apiKey) {
  try {
    const data = await pedir(`${API}/api/v1/chat/credit`, { method: 'GET' }, apiKey);
    return { creditos: data.data?.credits ?? data.data ?? null, crudo: data.data };
  } catch {
    return null;
  }
}

export function resolverLlave(request) {
  return (
    request?.headers?.get?.('x-kie-key') ||
    request?.cookies?.get?.('kie_key')?.value ||
    process.env.KIE_API_KEY ||
    null
  );
}
