/**
 * MARKETING STUDIO — MOTOR SOBRE KIE
 * -----------------------------------------------------------------------------
 * Marketing Studio venia atado a MuAPI (modelo seedance-2-vip-omni-reference).
 * Aqui corre sobre la misma cuenta de Kie que ya usa el resto del sistema.
 *
 * Kie no ofrece exactamente lo que la interfaz promete, asi que el motor cubre
 * la diferencia en vez de fingir que encaja:
 *
 *   DURACION  la interfaz ofrece 4–15 s; Veo entrega clips de 8 s.
 *             Se generan los clips necesarios, se encadenan por el ultimo
 *             frame (misma tecnica que el video largo, que ya funciona) y se
 *             recorta al segundo exacto que se pidio.
 *
 *   FORMATO   la interfaz ofrece 9:16, 3:4, 4:3, 16:9 y 1:1; Veo entrega 9:16
 *             o 16:9. Se genera en el mas cercano y se recorta CENTRADO al
 *             ratio pedido. Nunca se deforma la imagen.
 *
 *   CALIDAD   el modo de referencias solo admite Veo Fast y Veo Lite, asi que
 *             1080p usa veo3_fast (1080p nativo) y 720p usa veo3_lite.
 *
 * Todo lo que ya estaba resuelto para TikTok se reutiliza: proveedor, control
 * de saldo, errores tipados, cache de clips y union sin recodificar.
 */

import { generarVideo } from '../tiktok/providers/kie.js';
import { extraerFrames, unirClips, ajustarVideo, limpiarClips, leerRatio } from '../tiktok/media.js';
import { subirConCache } from '../tiktok/refCache.js';
import { verificarSaldo, contadorDeGasto } from '../tiktok/creditos.js';
import { clasificar, ErrorVideo, CODIGOS } from '../tiktok/errors.js';
import { actualizarJob } from '../tiktok/store.js';

const SEGUNDOS_POR_CLIP = 8;
// Coste por clip de 8s segun el modelo que se acabe usando. Ya no hay tarifa
// de "calidad" porque veo3 no admite referencias y aqui nunca se usa.
const COSTO_CLIP_FAST = 0.4;
const COSTO_CLIP_LITE = 0.2;

/** Ratios que Kie genera de forma nativa. */
const RATIOS_NATIVOS = ['9:16', '16:9'];

/** El ratio nativo mas parecido al pedido. */
export function ratioNativo(ratio) {
  const objetivo = leerRatio(ratio);
  if (!objetivo) return '9:16';
  if (RATIOS_NATIVOS.includes(ratio)) return ratio;
  // Mas ancho que alto -> 16:9; si no, vertical.
  return objetivo >= 1 ? '16:9' : '9:16';
}

export function clipsNecesarios(duracion) {
  const seg = Math.max(1, Number(duracion) || 5);
  return Math.max(1, Math.ceil(seg / SEGUNDOS_POR_CLIP));
}

/**
 * Que modelo de Veo usar.
 *
 * OJO, esto costo un fallo en produccion: el modo de referencias
 * (REFERENCE_2_VIDEO) SOLO lo soportan Veo Fast y Veo Lite. Con veo3 el
 * proveedor responde "Reference to video only supports the Veo Fast model and
 * Veo Lite model" — y con HTTP 200, asi que ni siquiera parece un error de red.
 *
 * Marketing Studio siempre manda la foto del producto como referencia, asi que
 * aqui NUNCA puede usarse veo3. La eleccion de calidad se traduce entre los dos
 * modelos que si admiten referencias: Fast (1080p nativo) y Lite (mas ligero).
 */
export function modeloDe(resolucion) {
  return resolucion === '720p' ? 'veo3_lite' : 'veo3_fast';
}

export function costoEstimado({ duracion, resolucion }) {
  const porClip = resolucion === '720p' ? COSTO_CLIP_LITE : COSTO_CLIP_FAST;
  return Math.round(clipsNecesarios(duracion) * porClip * 100) / 100;
}

/**
 * Prompt para el modelo de video.
 *
 * El usuario escribe el guion del anuncio en su idioma; se envuelve con las
 * instrucciones tecnicas y, sobre todo, con la regla de fidelidad: el producto
 * de la referencia se copia, no se reinterpreta. Es la misma leccion que costo
 * cara en el motor de TikTok.
 */
function construirPrompt({ prompt, referencias, ratio, continuacion = false }) {
  const mapa = {};
  referencias.forEach((_, i) => {
    mapa[`IMAGE_${i + 1}`] = i === 0 ? 'the product — the single source of truth for how it looks' : `additional reference ${i + 1}`;
  });

  return JSON.stringify({
    reference_images: mapa,
    ad_script: prompt,
    ...(continuacion
      ? { continuing: 'continue the previous shot seamlessly, same subject, same location, same lighting' }
      : { framing: `${ratio} vertical or horizontal as specified, cinematic advertising look` }),
    product_fidelity: {
      rule_1:
        'The product must be a pixel-faithful replica of IMAGE 1: same shape, same proportions, same colors, same finish, same label artwork and same label text.',
      rule_2:
        'Do NOT redesign, restyle, rebrand, recolor or "improve" the product. Do NOT invent label text or logos that are not in the reference.',
    },
    avoid:
      'no morphing, no extra limbs, no facial distortion, no object duplication, no abrupt scene change, no text artifacts, no watermarks',
  });
}

/**
 * Genera el anuncio completo. Se llama SIN await desde la ruta: el trabajo
 * sigue en segundo plano y el cliente consulta el estado.
 */
export async function generarAnuncio(jobId, { apiKey, prompt, ratio, resolucion, duracion, imagenes = [] }) {
  const clipsUrls = [];
  const modelo = modeloDe(resolucion);
  const gasto = contadorDeGasto({
    estimadoPorClipUsd: resolucion === '720p' ? COSTO_CLIP_LITE : COSTO_CLIP_FAST,
  });

  try {
    if (!imagenes.length) {
      throw new ErrorVideo(CODIGOS.PROVIDER_ERROR, 'Hace falta al menos la imagen del producto.');
    }

    const total = clipsNecesarios(duracion);
    const nativo = ratioNativo(ratio);

    // Pre-vuelo: un anuncio a medias no le sirve a nadie.
    actualizarJob(jobId, { mensaje: 'Revisando saldo...' });
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costoEstimado({ duracion, resolucion }),
      etiqueta: `un anuncio de ${duracion}s (${total} clip${total > 1 ? 's' : ''})`,
    });
    actualizarJob(jobId, { saldo_previo: preVuelo.saldo });

    // Clip 1: las imagenes del usuario son la referencia.
    actualizarJob(jobId, { estado: 'generando', mensaje: `Generando clip 1 de ${total}...` });
    const base = await generarVideo(
      {
        modelo,
        modo: 'REFERENCE_2_VIDEO',
        prompt: construirPrompt({ prompt, referencias: imagenes, ratio: nativo }),
        imagenes,
        aspect_ratio: nativo,
      },
      apiKey
    );

    clipsUrls.push(base.url);
    gasto.registrar(base.creditos);

    // Clips siguientes: se encadenan por el ultimo frame del anterior para que
    // no parezcan escenas distintas.
    let ultimoUrl = base.url;
    for (let i = 1; i < total; i++) {
      actualizarJob(jobId, { mensaje: `Generando clip ${i + 1} de ${total}...` });

      const [frameFinal] = await extraerFrames(ultimoUrl, ['ultimo']);
      const frameUrl = await subirConCache(frameFinal, { apiKey, proveedor: 'kie', nombre: `mkt-frame-${i}.png` });

      const ext = await generarVideo(
        {
          modelo,
          modo: 'REFERENCE_2_VIDEO',
          prompt: construirPrompt({ prompt, referencias: imagenes, ratio: nativo, continuacion: true }),
          // El frame va primero para dar continuidad, pero el producto sigue
          // presente como referencia: el frame ya viene degradado y copiar de
          // una copia es como se pierde la fidelidad entre clips.
          imagenes: [frameUrl, ...imagenes],
          aspect_ratio: nativo,
        },
        apiKey
      );

      clipsUrls.push(ext.url);
      gasto.registrar(ext.creditos);
      ultimoUrl = ext.url;
    }

    // Union (solo si hay mas de uno) y ajuste final de duracion y encuadre.
    actualizarJob(jobId, { mensaje: 'Montando el anuncio...' });
    let fuente = clipsUrls[0];
    if (clipsUrls.length > 1) {
      const unido = await unirClips(clipsUrls);
      fuente = await subirConCache(unido, {
        apiKey,
        proveedor: 'kie',
        nombre: 'mkt-unido.mp4',
        tipo: 'video/mp4',
      });
    }

    const necesitaAjuste = duracion < SEGUNDOS_POR_CLIP * clipsUrls.length || !RATIOS_NATIVOS.includes(ratio);
    let urlFinal = fuente;

    if (necesitaAjuste) {
      actualizarJob(jobId, { mensaje: `Ajustando a ${duracion}s y ${ratio}...` });
      const ajustado = await ajustarVideo(fuente, {
        segundos: duracion,
        ratio: RATIOS_NATIVOS.includes(ratio) ? null : ratio,
      });
      urlFinal = await subirConCache(ajustado, {
        apiKey,
        proveedor: 'kie',
        nombre: 'mkt-final.mp4',
        tipo: 'video/mp4',
      });
    }

    const t = gasto.total;
    actualizarJob(jobId, {
      estado: 'terminado',
      mensaje: 'Anuncio listo.',
      url: urlFinal,
      clips: clipsUrls,
      duracion,
      ratio,
      resolucion,
      costo_real: t.usd,
      costo_creditos: t.creditos,
      aviso: 'Descarga el video hoy: las URLs del proveedor caducan.',
    });

    return { url: urlFinal };
  } catch (e) {
    const err = clasificar(e);
    console.error(`[Marketing] Fallo (${err.codigo}):`, err.message);
    actualizarJob(jobId, {
      estado: 'error',
      mensaje: err.message,
      error: err.aJSON(),
      costo_real: gasto.total.usd,
    });
    throw err;
  } finally {
    limpiarClips(clipsUrls);
  }
}
