/**
 * PH TikTok Shop Engine — PIPELINE
 * -----------------------------------------------------------------------------
 * Un producto + un avatar -> N videos listos para TikTok Shop.
 *
 *   1. Ficha del producto   (vision: lee la foto)
 *   2. Plan de variaciones  (matriz determinista, sin repetir hooks)
 *   3. Guion por variacion  (LLM con la estructura del cliente)
 *   4. Video:
 *        - motor con referencia directa -> avatar + producto -> video (1 paso)
 *        - motor con frame              -> frame maestro -> video (2 pasos)
 */

import { completarJSON } from './llm.js';
import {
  systemPromptGuionista,
  promptVariacion,
  reforzarPromptVideo,
  reforzarPromptFrame,
} from './prompts.js';
import { construirPlanDeVariaciones } from './variants.js';
import { getMotor, costoPorVideo, costoLote } from './engines.js';
import { getProveedor } from './providers/index.js';
import { actualizarJob, actualizarVariacion, getGanadores } from './store.js';
import { getKnowledge } from './knowledgeStore.js';
import { verificarSaldo } from './creditos.js';
import { clasificar, CODIGOS, ErrorVideo } from './errors.js';
import { limpiarCache } from './refCache.js';
import {
  fichaForense,
  fusionarContexto,
  identidadCanonica,
  necesitaContexto,
  armarReferencias,
} from './producto.js';

/**
 * Cuantos videos se generan a la vez.
 * El documento del agente de video pide paralelo puro (Promise.all): un lote de
 * 6 tarda lo que tarda 1, no 6 veces mas. Pero disparar 10 tareas de Veo de golpe
 * choca con los limites del proveedor, asi que va acotado.
 * Se sube o baja con PH_CONCURRENCIA sin tocar codigo.
 */
const CONCURRENCIA = Math.max(1, Number(process.env.PH_CONCURRENCIA) || 3);

/** Corre `tarea` sobre `items` con un maximo de N en vuelo a la vez. */
async function enParalelo(items, limite, tarea) {
  const resultados = new Array(items.length);
  let siguiente = 0;

  const obrero = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      resultados[i] = await tarea(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, obrero));
  return resultados;
}

// --- Paso 1: ficha del producto ---

/**
 * Ficha del producto con nivel de detalle forense (ver lib/tiktok/producto.js).
 * Lo que el vendedor escribio a mano siempre gana sobre lo que dedujo la vision.
 */
export async function fichaDelProducto({ imagenProducto, datosManuales = {}, idioma = 'es' }) {
  const ficha = await fichaForense({ imagenProducto, idioma });
  return fusionarContexto(ficha, datosManuales);
}

// --- Paso 3: guion ---

export async function escribirGuion({ producto, avatar, variacion, duracion, idioma, referenciaDirecta, productoFijo }) {
  const guion = await completarJSON({
    system: systemPromptGuionista({ idioma }),
    user: promptVariacion({ producto, avatar, variacion, duracion, idioma, referenciaDirecta, productoFijo }),
    maxTokens: 2500,
  });
  return { ...guion, idioma, ...revisarCumplimiento(guion) };
}

/** Filtro propio de cumplimiento: no confiamos solo en el LLM. */
function revisarCumplimiento(guion) {
  const { COMPLIANCE } = getKnowledge();
  const texto = `${guion.dialogo || ''} ${guion.caption || ''} ${guion.hook || ''}`.toLowerCase();
  const encontradas = COMPLIANCE.frases_prohibidas.filter((f) => texto.includes(String(f).toLowerCase()));

  if (!encontradas.length) return {};
  return {
    cumplimiento: {
      riesgo: 'alto',
      notas: `Frases de riesgo detectadas: ${encontradas.join(', ')}. Revisar antes de publicar.`,
      detectadas: encontradas,
    },
  };
}

// --- Paso 4: video ---

export async function producirVideo({
  guion,
  motorId,
  duracion,
  avatarUrl,
  productoUrl,
  productoFijo,
  apiKey,
  onEvento,
}) {
  const motor = getMotor(motorId);
  const proveedor = getProveedor(motor.proveedor);

  // El mapa de indices se arma junto al array: el modelo tiene que saber cual
  // de las imagenes es el producto, o lo rediseña.
  const { imagenes: referencias, mapa } = armarReferencias({ avatarUrl, productoUrl });

  const promptVideo = reforzarPromptVideo(guion.prompt_video, {
    duracion,
    productoFijo,
    mapa,
  });

  // Camino corto: el motor acepta avatar y producto como referencias.
  if (!motor.frame) {
    onEvento?.({ paso: 'video', mensaje: 'Generando video (avatar + producto directo)...' });
    const video = await proveedor.generarVideo(
      {
        modelo: motor.video.modelo,
        modo: motor.video.modo,
        prompt: promptVideo,
        imagenes: referencias,
        duracion,
        aspect_ratio: '9:16',
      },
      apiKey,
      { onTick: (t) => onEvento?.({ paso: 'video', mensaje: `Generando video... ${t.progreso ?? ''}` }) }
    );
    return { videoUrl: video.url, frameUrl: null, requestId: video.requestId, creditos: video.creditos };
  }

  // Camino largo: primero el frame maestro, luego se anima.
  // El frame es donde MAS se rediseña el producto (es un modelo de imagen con
  // libertad creativa), asi que la identidad canonica va tambien aqui.
  onEvento?.({ paso: 'frame', mensaje: 'Armando el frame maestro (avatar + producto)...' });
  const frame = await proveedor.generarFrame(
    {
      modelo: motor.frame.modelo,
      prompt: reforzarPromptFrame(guion.prompt_frame || guion.prompt_video, { productoFijo, mapa }),
      imagenes: referencias,
      aspect_ratio: '9:16',
    },
    apiKey
  );

  onEvento?.({ paso: 'video', mensaje: 'Animando el frame con audio...', frameUrl: frame.url });
  const video = await proveedor.generarVideo(
    {
      modelo: motor.video.modelo,
      modo: motor.video.modo,
      prompt: promptVideo,
      imagenes: [frame.url],
      duracion,
      aspect_ratio: '9:16',
      imageField: motor.video.imageField,
      extra: motor.video.extra,
    },
    apiKey
  );

  return {
    frameUrl: frame.url,
    videoUrl: video.url,
    requestId: video.requestId,
    creditos: (frame.creditos || 0) + (video.creditos || 0) || null,
  };
}

// --- Reparto de idiomas ---

function repartirIdiomas(cantidad, idioma) {
  if (idioma !== 'mixto') return Array.from({ length: cantidad }, () => idioma);
  // Alterna ES / EN para poder testear los dos mercados en el mismo lote.
  return Array.from({ length: cantidad }, (_, i) => (i % 2 === 0 ? 'es' : 'en'));
}

// --- Lote completo ---

/**
 * Se llama SIN await desde la ruta API: el lote sigue corriendo en segundo
 * plano y el cliente consulta el estado.
 */
export async function correrLote(jobId, config) {
  const {
    apiKey,
    avatarUrl,
    productoUrl,
    producto: productoManual,
    avatar,
    cantidad,
    motorId,
    duracion,
    idioma,
    estrategias,
    seed,
    iterar,
  } = config;

  const motor = getMotor(motorId);
  const referenciaDirecta = !motor.frame;

  try {
    limpiarCache();

    // 0. Pre-vuelo de saldo: mejor no empezar que dejar el lote a medias.
    actualizarJob(jobId, { estado: 'analizando', mensaje: 'Revisando saldo...' });
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: motor.proveedor,
      costoEstimadoUsd: costoLote(motorId, cantidad),
      etiqueta: `un lote de ${cantidad} videos`,
    });
    actualizarJob(jobId, { saldo_previo: preVuelo.saldo, saldo_verificado: preVuelo.verificado });

    // 1. Ficha forense del producto: la identidad exacta que hay que reproducir.
    actualizarJob(jobId, { mensaje: 'Leyendo el producto en detalle...' });
    const idiomaFicha = idioma === 'mixto' ? 'es' : idioma;
    const producto = await fichaDelProducto({
      imagenProducto: productoUrl,
      datosManuales: productoManual,
      idioma: idiomaFicha,
    });

    // Una sola cadena, calculada una vez, que se repite igual en TODOS los videos
    // del lote. Si se recalculara por video, cada uno saldria distinto.
    const productoFijo = identidadCanonica(producto);

    actualizarJob(jobId, {
      producto,
      producto_fijo: productoFijo,
      necesita_contexto: necesitaContexto(producto),
      falta_contexto: producto.falta_contexto,
    });

    if (necesitaContexto(producto)) {
      console.warn('[PH TikTok] Producto con contexto insuficiente:', producto.falta_contexto);
    }

    // 2. Plan de variaciones
    const ganadores = iterar ? getGanadores({ limite: 3 }) : [];
    const plan = construirPlanDeVariaciones({ n: cantidad, seed, estrategias, ganadores });
    const idiomas = repartirIdiomas(plan.length, idioma);

    actualizarJob(jobId, {
      estado: 'guionizando',
      mensaje: 'Escribiendo los guiones...',
      variaciones: plan.map((p, i) => ({ id: p.id, plan: p, idioma: idiomas[i], estado: 'pendiente' })),
    });

    // 3. Guiones en paralelo
    const guiones = await Promise.all(
      plan.map(async (variacion, i) => {
        try {
          const guion = await escribirGuion({
            producto,
            productoFijo,
            avatar,
            variacion,
            duracion,
            idioma: idiomas[i],
            referenciaDirecta,
          });
          actualizarVariacion(jobId, variacion.id, { guion, estado: 'guion_listo' });
          return { variacion, guion };
        } catch (e) {
          const err = clasificar(e, { shotId: variacion.id });
          actualizarVariacion(jobId, variacion.id, { estado: 'error', error: err.aJSON() });
          return { error: err.message };
        }
      })
    );

    const validos = guiones.filter((g) => g && g.guion);
    if (!validos.length) {
      // El motivo real, no una suposicion. Mandar a "revisar la llave" cuando lo
      // que pasa es que el proveedor devuelve 500 hace perder el tiempo a quien
      // lo lee.
      const motivo = guiones.find((g) => g?.error)?.error || 'sin detalle del proveedor';
      throw new ErrorVideo(CODIGOS.NO_SCRIPT, `No se pudo escribir ningun guion. ${motivo}`);
    }

    // 4. Videos en paralelo acotado: el lote tarda lo que tarda el mas lento
    //    por tanda, no la suma de todos.
    actualizarJob(jobId, {
      estado: 'generando',
      mensaje: `Generando ${validos.length} videos (${Math.min(CONCURRENCIA, validos.length)} a la vez)...`,
    });

    let sinSaldo = false;

    await enParalelo(validos, CONCURRENCIA, async ({ variacion, guion }) => {
      // Si un video ya murio por saldo, los siguientes tampoco van a salir.
      if (sinSaldo) {
        actualizarVariacion(jobId, variacion.id, {
          estado: 'error',
          error: { codigo: CODIGOS.INSUFFICIENT_CREDITS, mensaje: 'Cancelado: el lote se quedo sin creditos.' },
        });
        return;
      }

      try {
        actualizarVariacion(jobId, variacion.id, { estado: 'generando' });

        const resultado = await producirVideo({
          guion,
          motorId,
          duracion,
          avatarUrl,
          productoUrl,
          productoFijo,
          apiKey,
          onEvento: (e) => actualizarVariacion(jobId, variacion.id, { paso: e.paso, mensaje: e.mensaje }),
        });

        actualizarVariacion(jobId, variacion.id, {
          ...resultado,
          estado: 'listo',
          costo: resultado.creditos ?? costoPorVideo(motorId),
          costoEsCreditos: resultado.creditos != null,
        });
      } catch (e) {
        const err = clasificar(e, { shotId: variacion.id });
        if (err.codigo === CODIGOS.INSUFFICIENT_CREDITS) sinSaldo = true;
        actualizarVariacion(jobId, variacion.id, { estado: 'error', error: err.aJSON() });
      }
    });

    const job = actualizarJob(jobId, { estado: 'terminado', mensaje: 'Listo.' });
    const ok = (job.variaciones || []).filter((v) => v.estado === 'listo').length;
    actualizarJob(jobId, {
      resumen: `${ok}/${job.variaciones.length} videos generados`,
      aviso: 'Descarga los videos hoy: las URLs del proveedor caducan.',
    });
  } catch (e) {
    const err = clasificar(e);
    console.error(`[PH TikTok] Lote fallido (${err.codigo}):`, err.message);
    actualizarJob(jobId, { estado: 'error', mensaje: err.message, error: err.aJSON() });
  }
}
