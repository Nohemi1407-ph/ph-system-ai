/**
 * MARKETING STUDIO — CLIENTE KIE
 * -----------------------------------------------------------------------------
 * Mismo contrato que las funciones de muapi.js que sustituye, para que la
 * interfaz no cambie: se llama, se espera, y devuelve { url }.
 *
 * La diferencia esta debajo: en vez de hablar con MuAPI desde el navegador,
 * habla con nuestras rutas, que usan la cuenta de Kie del servidor. Asi la
 * llave nunca sale al cliente.
 */

const INTERVALO_MS = [2000, 3000, 5000]; // sondeo adaptativo: rapido al principio
const ESPERA_MAX_MS = 15 * 60 * 1000;

function intervalo(intento) {
  return INTERVALO_MS[Math.min(intento, INTERVALO_MS.length - 1)];
}

async function pedir(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalle = data.sugerencia ? `${data.error} — ${data.sugerencia}` : data.error;
    throw new Error(detalle || `Error ${res.status}`);
  }
  return data;
}

/**
 * Sube un archivo y devuelve su URL publica.
 * Usa XHR en vez de fetch porque la interfaz muestra barra de progreso, y fetch
 * no reporta progreso de subida.
 */
export function uploadFile(_apiKey, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/tiktok/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error('El servidor devolvió una respuesta ilegible al subir el archivo.'));
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
      else reject(new Error(data.error || `Error ${xhr.status} al subir el archivo.`));
    };

    xhr.onerror = () => reject(new Error('Se cortó la conexión al subir el archivo.'));
    xhr.send(form);
  });
}

/**
 * Genera el anuncio. Lanza el trabajo y sondea hasta que termina.
 *
 * @param {Object} params  prompt, aspect_ratio, duration, resolution, images_list
 * @param {(estado: {mensaje: string}) => void} [params.onEstado]
 * @returns {Promise<{url: string, costo?: number}>}
 */
export async function generateMarketingStudioAd(_apiKey, params) {
  const { jobId } = await pedir('/api/marketing/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio || '9:16',
      resolution: params.resolution || '1080p',
      duration: params.duration || 5,
      images_list: params.images_list || [],
    }),
  });

  params.onRequestId?.(jobId);

  const limite = Date.now() + ESPERA_MAX_MS;
  let intento = 0;

  while (Date.now() < limite) {
    await new Promise((r) => setTimeout(r, intervalo(intento++)));

    const job = await pedir(`/api/marketing/job/${jobId}`);
    params.onEstado?.({ mensaje: job.mensaje });

    if (job.estado === 'terminado' && job.url) {
      return { url: job.url, costo: job.costo_real };
    }
    if (job.estado === 'error') {
      throw new Error(job.mensaje || 'La generación falló.');
    }
  }

  throw new Error('Se agotó el tiempo de espera. El trabajo puede seguir corriendo: recarga en unos minutos.');
}
