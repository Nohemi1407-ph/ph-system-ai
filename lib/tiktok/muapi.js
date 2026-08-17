/**
 * PH TikTok Shop Engine — CLIENTE MUAPI (servidor)
 * -----------------------------------------------------------------------------
 * Mismo contrato que packages/studio/src/muapi.js pero corriendo en el servidor,
 * para que el pipeline siga trabajando aunque el usuario cierre la pestaña.
 */

const BASE_URL = process.env.MUAPI_BASE_URL || 'https://api.muapi.ai';

export function resolverLlave(request) {
  return (
    request?.headers?.get?.('x-api-key') ||
    request?.cookies?.get?.('muapi_key')?.value ||
    process.env.MUAPI_API_KEY ||
    null
  );
}

async function submit(endpoint, payload, apiKey) {
  const res = await fetch(`${BASE_URL}/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MuAPI ${endpoint} → ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.request_id || data.id || null;
}

export async function esperarResultado(requestId, apiKey, { intentos = 450, intervalo = 2000, onTick } = {}) {
  const url = `${BASE_URL}/api/v1/predictions/${requestId}/result`;

  for (let i = 1; i <= intentos; i++) {
    await new Promise((r) => setTimeout(r, intervalo));

    let data;
    try {
      const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
      if (!res.ok) {
        if (res.status >= 500) continue;
        throw new Error(`Polling ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      data = await res.json();
    } catch (e) {
      if (i === intentos) throw e;
      continue;
    }

    const estado = (data.status || '').toLowerCase();
    onTick?.({ intento: i, estado });

    if (['completed', 'succeeded', 'success'].includes(estado)) {
      return data.outputs?.[0] || data.url || data.output?.url || null;
    }
    if (['failed', 'error'].includes(estado)) {
      throw new Error(`Generación fallida: ${data.error || data.detail || 'sin detalle'}`);
    }
  }
  throw new Error('Tiempo de espera agotado en MuAPI.');
}

async function correr(endpoint, payload, apiKey, opts) {
  const requestId = await submit(endpoint, payload, apiKey);
  if (!requestId) throw new Error(`MuAPI ${endpoint} no devolvió request_id.`);
  opts?.onRequestId?.(requestId);
  const url = await esperarResultado(requestId, apiKey, opts);
  if (!url) throw new Error(`MuAPI ${endpoint} terminó sin URL de salida.`);
  return { url, requestId };
}

/** Imagen a partir de varias imágenes de referencia (avatar + producto). */
export function generarFrame({ endpoint, prompt, imagenes, aspect_ratio = '9:16' }, apiKey, opts) {
  return correr(endpoint, { prompt, images_list: imagenes, aspect_ratio }, apiKey, {
    intentos: 120,
    ...opts,
  });
}

/** Video a partir de un frame. */
export function generarVideo(
  { endpoint, prompt, image_url, duration, aspect_ratio = '9:16', imageField = 'image_url', extra = {} },
  apiKey,
  opts
) {
  const payload = { prompt, aspect_ratio, duration, ...extra };
  if (imageField === 'images_list') payload.images_list = [image_url];
  else payload[imageField] = image_url;

  return correr(endpoint, payload, apiKey, { intentos: 450, ...opts });
}

/** Sube un archivo (Blob/File) y devuelve la URL alojada. */
export async function subirArchivo(file, apiKey) {
  const form = new FormData();
  form.append('file', file, file.name || 'upload');

  const res = await fetch(`${BASE_URL}/api/v1/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  });

  if (!res.ok) throw new Error(`Subida fallida ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const url = data.url || data.file_url || data.data?.url;
  if (!url) throw new Error('MuAPI no devolvió URL del archivo.');
  return url;
}

/** Saldo de la cuenta (para mostrar créditos en la UI). */
export async function saldo(apiKey) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/account/balance`, { headers: { 'x-api-key': apiKey } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
