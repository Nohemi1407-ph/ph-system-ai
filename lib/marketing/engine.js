/**
 * MARKETING STUDIO — MOTOR SOBRE KIE
 * -----------------------------------------------------------------------------
 * Marketing Studio venia atado a MuAPI (seedance-2-vip-omni-reference). Ahora
 * corre sobre la misma cuenta de Kie que el resto del sistema.
 *
 * CAMINO PREFERENTE: Seedance 2.5 (bytedance/seedance-2-5). Hace nativamente
 * todo lo que la interfaz promete, sin parches:
 *   · duracion 4-30 s de una pieza
 *   · ratio exacto (1:1, 4:3, 3:4, 16:9, 9:16, 21:9)
 *   · resolucion 480p / 720p / 1080p
 *   · hasta 30 imagenes y 10 videos de referencia, asi que la plantilla UGC
 *     vuelve a usarse de verdad
 *
 * RESPALDO: Veo 3.1, si Seedance no responde. Un proveedor caido no puede
 * dejar el estudio inservible — la leccion del dia que Kie tumbo todo. Ahi si
 * hay que encadenar clips de 8 s, unirlos y recortar al final, porque Veo no
 * da ni la duracion ni el ratio pedidos. Y solo Veo Fast y Veo Lite admiten
 * imagenes de referencia: con veo3 el proveedor responde HTTP 200 con un error
 * dentro, y la tarea nunca se crea.
 */

import { generarVideo } from '../tiktok/providers/kie.js';
import { ejecutar } from '../kie/motor.js';
import { costoEnCreditos, CREDITOS_POR_USD } from '../kie/precios.js';
import { fichaForense, identidadCanonica } from '../tiktok/producto.js';
import { interpretarBrief } from './brief.js';
import { extraerFrames, unirClips, ajustarVideo, limpiarClips, leerRatio } from '../tiktok/media.js';
import { subirConCache } from '../tiktok/refCache.js';
import { verificarSaldo, contadorDeGasto } from '../tiktok/creditos.js';
import { clasificar, ErrorVideo, CODIGOS } from '../tiktok/errors.js';
import { actualizarJob } from '../tiktok/store.js';

const SEGUNDOS_POR_CLIP = 8;

/**
 * Modelo de Marketing Studio.
 *
 * Por defecto Veo 3.1 Fast, y no por costumbre sino por precio: los Seedance se
 * cobran POR SEGUNDO (Seedance 2.0 Fast son ~124 creditos por 5 s a 720p; la
 * 2.5, 315), mientras que Veo cobra ~40 creditos por clip de 8 s. Para un
 * anuncio corto es entre 3 y 8 veces mas barato.
 *
 * A cambio, Veo no da la duracion ni el ratio exactos y hay que encadenar y
 * recortar. Eso ya esta resuelto abajo.
 *
 * Con PH_MODELO_MARKETING se pasa a 'seedance-2-fast', 'seedance-2-mini' o
 * 'seedance-2-5' cuando se prefiera calidad o una sola pieza larga.
 */
const MODELO_MARKETING = process.env.PH_MODELO_MARKETING || 'veo';
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

export function costoEstimado({ duracion, resolucion, conVideoRef = false }) {
  const { creditos } = costoEnCreditos(modeloKieDe(), { duracion, resolucion, conVideoRef });
  return creditos / CREDITOS_POR_USD;
}

/** El id de Kie del modelo configurado, para poder tarifarlo. */
function modeloKieDe() {
  if (MODELO_MARKETING === 'veo') return resolucionVeo();
  return (
    {
      'seedance-2-fast': 'bytedance/seedance-2-fast',
      'seedance-2-mini': 'bytedance/seedance-2-mini',
      'seedance-2-5': 'bytedance/seedance-2-5',
    }[MODELO_MARKETING] || 'bytedance/seedance-2-fast'
  );
}

/** Veo se tarifa por clip segun el modelo concreto que se acabe usando. */
function resolucionVeo() {
  return modeloDe(arguments[0]) === 'veo3_lite' ? 'veo3_lite' : 'veo3_fast';
}

/**
 * Prompt para el modelo de video.
 *
 * El usuario escribe el guion del anuncio en su idioma; se envuelve con las
 * instrucciones tecnicas y, sobre todo, con la regla de fidelidad: el producto
 * de la referencia se copia, no se reinterpreta. Es la misma leccion que costo
 * cara en el motor de TikTok.
 */
function construirPrompt({ prompt, referencias, ratio, continuacion = false, identidadProducto = '', brief = null }) {
  const mapa = {};
  referencias.forEach((_, i) => {
    mapa[`IMAGE_${i + 1}`] =
      i === 0 ? 'the product — the single source of truth for how it looks' : `additional reference ${i + 1}`;
  });

  return JSON.stringify({
    // Lo que escribio el vendedor, literal y primero. Es el encargo.
    user_instructions: prompt,
    instruction_priority:
      'user_instructions is the brief and overrides every other field here. If anything below contradicts it, follow user_instructions.',

    // Lo que se vende y —sobre todo— lo que NO se vende. Va antes que nada
    // visual: si el vendedor aclara "esto NO es una ampolla, solo el estuche",
    // protagonizar el plano con la ampolla arruina el anuncio, porque se
    // estaria ofreciendo algo que no esta a la venta.
    ...(brief?.producto_es ? { what_is_being_sold: brief.producto_es } : {}),
    ...(brief?.producto_no_es?.length
      ? {
          what_is_NOT_being_sold: brief.producto_no_es,
          negative_constraint:
            'These are explicitly NOT the product for sale. They may appear as contents or context, but must never be the hero of the shot.',
        }
      : {}),
    ...(brief?.protagonista ? { hero_of_the_shot: brief.protagonista } : {}),

    // Los primeros 3 segundos, arriba y separados del resto. Es lo que decide
    // si el video se ve o se pasa, y el modelo tiende a repartir la energia por
    // todo el clip si no se le marca donde va el golpe.
    ...(brief?.hook
      ? {
          first_3_seconds: {
            visual: brief.hook.visual,
            audio: brief.hook.audio,
            camera: brief.hook.camara,
            rule: 'This is the scroll-stopper. Put the strongest visual and the strongest line here, in the first 3 seconds. It must be the SAME scene, same person, same location and same product as the rest of the video — never a separate intro shot.',
            performance: 'The avatar must ACT: eye contact with the camera, real reaction, intent. Not posing with the product.',
          },
        }
      : {}),

    // El dialogo va aparte del resto: es lo que se oye, no lo que se ve.
    ...(brief?.dialogo ? { spoken_dialogue: brief.dialogo, dialogue_note: 'The avatar says exactly this, on camera.' } : {}),
    ...(brief?.tono ? { tone: brief.tono } : {}),
    ...(brief?.accion_visual ? { on_screen_action: brief.accion_visual } : {}),
    ...(brief?.indicaciones_rodaje?.length ? { shooting_notes: brief.indicaciones_rodaje } : {}),

    reference_images: mapa,

    product_identity: identidadProducto || undefined,
    product_fidelity: {
      rule_1:
        'The product must be a pixel-faithful replica of IMAGE 1: same shape, same proportions, same colors, same finish, same label artwork and same label text.',
      rule_2:
        'Do NOT redesign, restyle, rebrand, recolor, simplify or "improve" the product. Do NOT invent label text, logos or packaging that is not in the reference.',
      rule_3:
        'If part of the product is not visible in the reference, keep it plain and neutral — never invent decoration.',
    },

    ...(continuacion
      ? { continuing: 'continue the previous shot seamlessly, same subject, same location, same lighting' }
      : {}),
    default_look_if_not_specified: continuacion ? undefined : `${ratio} framing, natural advertising look`,

    avoid:
      'no morphing, no extra limbs, no facial distortion, no object duplication, no abrupt scene change, no text artifacts, no watermarks',
  });
}

/**
 * Identidad exacta del producto, leida de su foto.
 *
 * Es la misma ficha forense que hizo que el producto dejara de cambiar en el
 * motor de TikTok; aqui faltaba. Nunca bloquea: si el motor de texto no
 * responde, se devuelve la instruccion literal de copiar la imagen, que es lo
 * mas fiel que se puede pedir sin describirla.
 */
async function identidadDelProducto(imagenProducto) {
  if (!imagenProducto) return '';
  try {
    const ficha = await fichaForense({ imagenProducto });
    return identidadCanonica(ficha);
  } catch (e) {
    console.warn('[Marketing] No se pudo leer el producto:', e.message);
    return 'the exact product shown in IMAGE 1 — copy it pixel for pixel, do not redesign it';
  }
}

/**
 * Genera el anuncio completo. Se llama SIN await desde la ruta: el trabajo
 * sigue en segundo plano y el cliente consulta el estado.
 */
export async function generarAnuncio(jobId, { apiKey, prompt, ratio, resolucion, duracion, imagenes = [], videos = [] }) {
  // Veo configurado: se va directo, sin gastar un intento en el mercado.
  if (MODELO_MARKETING === 'veo') {
    return generarAnuncioConVeo(jobId, { apiKey, prompt, ratio, resolucion, duracion, imagenes });
  }

  // ── Camino preferente: Seedance 2.5 ──
  // Hace nativamente todo lo que abajo se resolvia a mano: hasta 30 s de una
  // pieza, el ratio exacto que pidas, y admite el video de plantilla como
  // referencia. Una sola tarea en vez de encadenar clips, unir y recortar.
  try {
    actualizarJob(jobId, { mensaje: 'Revisando saldo...' });
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costoEstimado({ duracion, resolucion }),
      etiqueta: `un anuncio de ${duracion}s a ${resolucion}`,
    });

    actualizarJob(jobId, {
      estado: 'generando',
      saldo_previo: preVuelo.saldo,
      modelo: MODELO_MARKETING,
      mensaje: `Generando ${duracion}s con ${MODELO_MARKETING}...`,
    });

    actualizarJob(jobId, { mensaje: 'Leyendo el producto...' });
    const identidadProducto = await identidadDelProducto(imagenes[0]);

    actualizarJob(jobId, { mensaje: 'Interpretando tu encargo...' });
    const brief = await interpretarBrief({ texto: prompt, identidadProducto, duracion });
    actualizarJob(jobId, { brief });

    const r = await ejecutar({
      modeloId: MODELO_MARKETING,
      apiKey,
      params: {
        prompt: construirPrompt({ prompt, referencias: imagenes, ratio, identidadProducto, brief }),
        image_urls: imagenes,
        video_urls: videos,
        duration: duracion,
        resolution: resolucion,
        aspect_ratio: ratio,
      },
      onTask: (taskId) => actualizarJob(jobId, { taskId }),
    });

    actualizarJob(jobId, {
      estado: 'terminado',
      mensaje: 'Anuncio listo.',
      url: r.url,
      duracion,
      ratio,
      resolucion,
      costo_creditos: r.creditos,
      aviso: 'Descarga el video hoy: las URLs del proveedor caducan.',
    });

    return { url: r.url };
  } catch (e) {
    const err = clasificar(e);
    console.error(`[Marketing] ${MODELO_MARKETING} fallo (${err.codigo}):`, err.message);

    // Sin saldo no se arregla probando otro modelo: se corta aqui.
    if (err.codigo === CODIGOS.INSUFFICIENT_CREDITS) {
      actualizarJob(jobId, { estado: 'error', mensaje: err.message, error: err.aJSON() });
      throw err;
    }

    actualizarJob(jobId, { mensaje: 'Seedance no respondió; reintentando con Veo...' });
    return generarAnuncioConVeo(jobId, { apiKey, prompt, ratio, resolucion, duracion, imagenes });
  }
}

/**
 * Camino de respaldo con Veo 3.1.
 *
 * Se conserva porque un proveedor caido no puede dejar el estudio inservible —
 * la leccion del dia que Kie tumbo todo. Aqui si hay que encadenar clips de 8 s
 * y recortar al final, porque Veo no da ni la duracion ni el ratio pedidos.
 */
async function generarAnuncioConVeo(jobId, { apiKey, prompt, ratio, resolucion, duracion, imagenes = [] }) {
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

    // Se lee UNA vez y se repite igual en todos los clips: si se recalculara
    // por clip, el producto podria describirse distinto en cada uno.
    actualizarJob(jobId, { mensaje: 'Leyendo el producto...' });
    const identidadProducto = await identidadDelProducto(imagenes[0]);

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
        prompt: construirPrompt({ prompt, referencias: imagenes, ratio: nativo, identidadProducto, brief }),
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
          prompt: construirPrompt({
            prompt,
            referencias: imagenes,
            ratio: nativo,
            continuacion: true,
            identidadProducto,
            brief,
          }),
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
    let avisoAjuste = null;

    if (necesitaAjuste) {
      // El video YA esta generado y YA esta cobrado. Si el recorte falla, se
      // entrega sin recortar y se avisa: perder un video pagado por no poder
      // ajustarle la duracion es el peor resultado posible, y es exactamente
      // lo que pasaba cuando ffprobe no estaba disponible en produccion.
      try {
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
      } catch (e) {
        console.warn('[Marketing] No se pudo ajustar; se entrega el video sin recortar:', e.message);
        avisoAjuste = `El video se generó pero no se pudo ajustar a ${duracion}s / ${ratio}: se entrega tal cual.`;
      }
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
      aviso: [avisoAjuste, 'Descarga el video hoy: las URLs del proveedor caducan.'].filter(Boolean).join(' '),
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
