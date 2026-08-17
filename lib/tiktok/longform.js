/**
 * PH TikTok Shop Engine — VIDEO LARGO (multi-shot encadenado)
 * -----------------------------------------------------------------------------
 * Un clip base + N continuaciones, unidas en un solo MP4.
 *
 * Estructura tomada del "Video Agent System Prompt" (repo agent-design):
 *   · arco narrativo segun cuantos shots caben       -> shotSystem.arcoNarrativo
 *   · catalogo de camara sin repetir dos seguidos    -> shotSystem.planMovimientos
 *   · sistema de diseno bloqueado en cada toma       -> shotSystem.bloqueSistema
 *   · normalizacion de consistencia ANTES de gastar  -> shotSystem.normalizarShots
 *   · pre-vuelo de saldo, para no quedarse a medias  -> creditos.verificarSaldo
 *   · errores con codigo y taskId recuperable        -> errors.ErrorVideo
 *   · portada + caption al terminar                  -> postproduccion
 */

import { completarJSON } from './llm.js';
import { generarVideo } from './providers/kie.js';
import { actualizarJob } from './store.js';
import { extraerFrames, unirClips, limpiarClips } from './media.js';
import { subirConCache, limpiarCache } from './refCache.js';
import { generarPortada, generarCaption } from './postproduccion.js';
import { verificarSaldo, contadorDeGasto } from './creditos.js';
import {
  fichaForense,
  fusionarContexto,
  identidadCanonica,
  reglasDeFidelidad,
  verificarFidelidad,
  necesitaContexto,
  armarReferencias,
} from './producto.js';
import { ErrorVideo, CODIGOS, clasificar } from './errors.js';
import {
  planDeShots,
  construirSistemaDeDiseno,
  bloqueSistema,
  normalizarShots,
  describirMovimiento,
  MOVIMIENTOS,
} from './shotSystem.js';

const CLIP_BASE = 8;

export function calcularClips(duracionDeseadaSeg) {
  const objetivo = Math.max(CLIP_BASE, Math.round(Number(duracionDeseadaSeg) || CLIP_BASE));
  const segmentosTotales = Math.max(1, Math.ceil(objetivo / CLIP_BASE));
  const duracionFinal = CLIP_BASE * segmentosTotales;
  return { extends: segmentosTotales - 1, duracionFinal, segmentosTotales };
}

const COSTO_CLIP_BASE = 0.4;

export function costoVideoLargo(duracionDeseadaSeg) {
  const { segmentosTotales } = calcularClips(duracionDeseadaSeg);
  return Math.round(COSTO_CLIP_BASE * segmentosTotales * 100) / 100;
}

const NEGATIVE_PROMPT =
  'no morphing, no extra limbs, no facial distortion, no object duplication, no abrupt scene change, no camera jump cuts within shot, no wearing the product as an accessory (no putting on as jewelry, clothing, or attached to the body) unless the product is literally an item of clothing or jewelry being tried on as its explicit purpose, do not redesign or change the product (keep it an exact replica of the reference: same color, same label, same shape, same packaging), do not change the person identity (keep same face, hair and clothing across all shots)';

// ─── Sistema de diseno: lo que queda congelado en todo el video ───────────────

/**
 * Identidad fija de la PERSONA. Mismo criterio forense que el producto: cuanto
 * mas cerrada la descripcion, menos espacio tiene el modelo para cambiar la cara
 * entre un clip y el siguiente.
 */
async function descripcionFija({ avatarUrl, productoUrl }) {
  const desc = await completarJSON({
    system:
      'Eres un director de fotografia. Describes con precision forense lo que ves, en ingles, para que un modelo de video mantenga la MISMA persona en todas las tomas. No adornas ni inventas. Devuelves solo JSON.',
    user: `Mira la imagen de la persona y devuelve las constantes visuales del video.

Para "avatar_fijo" se preciso y cerrado: edad aparente, tono de piel, forma del rostro, color y largo y peinado exacto del pelo, vello facial, cejas, color de ojos, gafas o accesorios, prenda superior con su color y cuello exacto, maquillaje si lo hay. Todo en UNA sola oracion en ingles. Esta oracion se va a repetir literal en cada toma, asi que no puede ser generica: "a woman with brown hair" no sirve.

{"avatar_fijo": "...", "entorno_sugerido": "a realistic everyday location where this person would use this product, in English, one short phrase", "iluminacion_sugerida": "natural lighting description in English, one short phrase"}`,
    imagenes: [avatarUrl, productoUrl].filter(Boolean),
    maxTokens: 600,
  });
  return desc;
}

// ─── Guion multi-shot ────────────────────────────────────────────────────────

function instruccionesDeShots(plan) {
  return plan
    .map(
      (s) =>
        `Shot ${s.shot_id} — rol "${s.rol}": ${s.objetivo}
   camera.movement OBLIGATORIO: "${s.movimiento}" (${s.movimiento_veo})`
    )
    .join('\n');
}

async function guionLargo({ producto, duracionFinal, plan, idioma, sistema }) {
  const idiomaDialogo = idioma === 'en' ? 'English' : idioma === 'pt' ? 'Portuguese' : 'Spanish';
  const segmentosTotales = plan.length;

  // El guionista necesita saber QUE es el producto para que el dialogo tenga
  // sentido. Antes recibia un objeto casi vacio y hablaba en abstracto.
  const bloqueProducto = `═══ QUE ES EL PRODUCTO (contexto real, no lo contradigas) ═══
Nombre: ${producto.nombre || '(sin nombre — no lo menciones)'}
Que es: ${producto.descripcion || '(deducelo de la identidad visual de abajo)'}
Beneficio principal a mostrar: ${producto.beneficio || '(el mas obvio al verlo en uso)'}
Publico: ${producto.publico || 'usuario general de TikTok Shop'}
Categoria: ${producto.categoria || 'general'}
Momento mas vendedor: ${producto.momento_satisfactorio || '(el instante en que se ve el resultado)'}
${producto.oferta ? `Oferta: ${producto.oferta}` : ''}
${producto.notas ? `Notas del vendedor (mandan sobre todo lo demas): ${producto.notas}` : ''}
${
  producto.identidad?.texto_etiqueta?.length
    ? `Texto real de la etiqueta: ${producto.identidad.texto_etiqueta.join(' / ')}. Puedes apoyarte en el, pero NUNCA inventes texto de etiqueta que no este en esta lista.`
    : ''
}
${
  !producto.descripcion && !producto.nombre
    ? 'No hay informacion escrita del producto. Esto es NORMAL, no un error: deduce el beneficio, el publico y el angulo de venta observando UNICAMENTE la identidad visual fija de abajo. Nunca rechaces la tarea, nunca pidas mas datos, nunca respondas con texto plano por esta razon. SIEMPRE devuelves el JSON pedido.'
    : ''
}`;

  const guion = await completarJSON({
    system: `Eres un generador de prompts para Veo3 especializado en evitar errores de continuidad visual. Reglas obligatorias en cada shot:
1. UN SOLO MOVIMIENTO DE CAMARA POR CLIP, y es el que se te asigna abajo. Nunca combines dos.
2. Repite EXACTAMENTE la misma descripcion fija del avatar en cada shot (character lock) - no uses referencias relativas ni la reescribas.
3. UNA SOLA ACCION PRINCIPAL POR CLIP.
4. Anclaje espacial explicito: posicion inicial y final del sujeto y del producto (izquierda/derecha/centro, distancia a camara).
5. Iluminacion y entorno FIJOS: son los mismos en todos los shots, declarados una vez por shot sin variar.
6. Todo en ingles excepto el dialogo hablado, que va en ${idiomaDialogo} dentro de comillas.
7. Si no se te da informacion escrita del producto (nombre, beneficio, publico, oferta vacios), esto es NORMAL, no un error: infiere tu mismo el beneficio, el publico y el angulo de venta observando UNICAMENTE la descripcion visual fija de abajo. Nunca rechaces la tarea, nunca pidas mas datos, nunca respondas con una explicacion en texto plano por esta razon. SIEMPRE devuelves el JSON pedido.
8. REGLA CRITICA sobre el producto: el sujeto SOLO muestra, sostiene o usa el producto (aplicandolo, senalandolo, exhibiendolo hacia camara). NUNCA se lo pone puesto como accesorio (collar, pulsera, prenda) salvo que el producto sea literalmente ropa o joyeria pensada para probarse. Esta es la causa mas comun de error: evitala siempre en "product.interaction" y en "subject.action".
9. El shot 1 (hook) DEBE tener, ademas del dialogo, un movimiento de camara rapido y llamativo en los primeros 3 segundos que funcione como scroll-stopper visual. Detallalo en "hook_visual".
10. FIDELIDAD EXACTA (critico): el avatar se mantiene identico en TODOS los shots (mismo rostro, pelo, ropa, edad — copia la descripcion fija sin cambiar una palabra) y el producto es replica exacta de su descripcion fija (mismo color, misma etiqueta, misma forma, mismo empaque). NUNCA rediseñes, cambies de color, cambies la marca ni reinterpretes el producto o la persona entre un shot y otro. Esta es la causa numero uno de rechazo del cliente.
11. ARCO NARRATIVO: cada shot tiene un rol asignado abajo y debe cumplirlo. El ULTIMO shot es SIEMPRE el CTA.
12. El campo "camera.movement" copia literal el id que se te asigna. Catalogo valido: ${MOVIMIENTOS.join(', ')}.
Devuelves solo JSON, sin explicaciones.`,
    user: `${bloqueProducto}

═══ CONSTANTES BLOQUEADAS (identicas en los ${segmentosTotales} shots) ═══
Avatar: ${sistema.avatarFijo}
Producto: ${sistema.productoFijo}
Entorno: ${sistema.entorno}
Iluminacion: ${sistema.iluminacion}
Acabado: ${sistema.acabado}

Necesito ${segmentosTotales} shots CONSECUTIVOS para sumar ${duracionFinal} segundos totales (${CLIP_BASE}s cada uno).

═══ ROL Y CAMARA DE CADA SHOT (obligatorio) ═══
${instruccionesDeShots(plan)}

El shot del CTA debe mencionar el carrito o bolsa de compras NARANJA que TikTok Shop pone en pantalla (es un elemento real de la interfaz, no inventado). El dialogo invita a darle click ahi, mencionando si hay oferta/descuento. Tono natural, ejemplos de referencia (adaptar al idioma ${idiomaDialogo} y al producto, NO copiar literal): "tiene oferta especial, picale en el carrito naranja" / "checalo, tiene descuento, dale click a la bolsita naranja". Si el idioma del dialogo no es espanol, traduce el concepto con naturalidad.

Responde exactamente este formato (array de ${segmentosTotales} objetos, en orden). El shot 1 lleva ademas "hook_visual":
{"shots": [
  {
    "shot_id": "1",
    "rol": "hook",
    "hook_visual": "descripcion breve en ingles del movimiento o transicion llamativa de los primeros 3 segundos",
    "camera": {"movement": "open_push_in", "start_position": "", "end_position": "", "focal_length": "medium|wide|close-up"},
    "subject": {"fixed_description": "${sistema.avatarFijo}", "start_pose": "", "end_pose": "", "action": "", "dialogo": "literal quote in ${idiomaDialogo}"},
    "product": {"position": "", "interaction": ""},
    "environment": {"location": "${sistema.entorno}", "lighting": "${sistema.iluminacion}"},
    "duration_seconds": ${CLIP_BASE}
  }
]}`,
    maxTokens: 3000,
  });

  if (!guion?.shots?.length) {
    throw new ErrorVideo(CODIGOS.NO_SCRIPT, 'El modelo de texto no devolvio ningun shot.');
  }
  return guion.shots;
}

/**
 * Una sola pasada de reparacion. Si el guion vuelve a romper el sistema de
 * diseno, se sigue igual: el prompt lleva las constantes bloqueadas de todas
 * formas, y no vale la pena quemar otra llamada al LLM.
 */
async function repararGuion({ shots, fallos, sistema }) {
  try {
    const r = await completarJSON({
      system: 'Corriges guiones de video manteniendo el formato JSON exacto que recibes. Devuelves solo JSON.',
      user: `Este guion rompe reglas de consistencia. Corrigelo SIN cambiar la estructura del JSON ni el numero de shots.

Fallos a corregir:
${fallos.map((f) => `· ${f.arreglo}`).join('\n')}

Recuerda: "subject.fixed_description" es literalmente "${sistema.avatarFijo}" en todos los shots, y el entorno y la iluminacion no cambian entre tomas.

Guion actual:
${JSON.stringify({ shots })}

Devuelve {"shots": [...]} corregido.`,
      maxTokens: 3000,
    });
    return r?.shots?.length === shots.length ? r.shots : shots;
  } catch (e) {
    console.warn('[PH TikTok] No se pudo reparar el guion:', e.message);
    return shots;
  }
}

// ─── Prompt final que ve el modelo de video ──────────────────────────────────
// Nohemi confirmo por pruebas propias que Veo3/Kie interpretan mejor un prompt
// en JSON estructurado que una oracion plana: menos errores de continuidad.
// Si algun dia el JSON empeora los resultados, pon PROMPT_EN_JSON = false.
const PROMPT_EN_JSON = true;

/**
 * Mapa de referencias que recibe el modelo, en el MISMO orden en que se envian.
 *
 * Esto era el agujero grande: se le mandaban 2 o 3 imagenes sin decirle cual era
 * cual. El modelo tenia que adivinar cual era el producto, y cuando adivinaba mal
 * lo rediseñaba. Ahora cada imagen va numerada y con su papel declarado.
 */
function mapaDeReferencias({ conFrame }) {
  return conFrame
    ? { persona: 1, frameAnterior: 2, producto: 3 }
    : { persona: 1, producto: 2 };
}


function bloqueReferencias(mapa = {}) {
  const b = {};
  if (mapa.persona) {
    b[`IMAGE_${mapa.persona}`] = 'the person — same face, hair, clothing in every shot';
  }
  if (mapa.frameAnterior) {
    b[`IMAGE_${mapa.frameAnterior}`] =
      'the last frame of the previous clip — use it for continuity of pose and framing only, NOT as the product reference';
  }
  if (mapa.producto) {
    b[`IMAGE_${mapa.producto}`] = 'the product — the single source of truth for what the product looks like';
  }
  return b;
}

function aplanarPrompt(shot, { sinDialogo = false, sistema, mapa = mapaDeReferencias({ conFrame: false }) } = {}) {
  const bloqueo = sistema ? bloqueSistema(sistema) : {};
  const fidelidad = reglasDeFidelidad({ indiceImagenProducto: mapa.producto });
  const movimiento = describirMovimiento(shot.camera?.movement);

  if (!PROMPT_EN_JSON) {
    const partes = [
      `Camera: ${movimiento}, from ${shot.camera.start_position} to ${shot.camera.end_position}, ${shot.camera.focal_length} shot.`,
      shot.hook_visual ? `Opening hook (first 3s): ${shot.hook_visual}.` : '',
      `Subject: ${shot.subject.fixed_description}. Starts ${shot.subject.start_pose}, performs: ${shot.subject.action}, ends ${shot.subject.end_pose}.`,
      !sinDialogo && shot.subject.dialogo ? `She/He says: "${shot.subject.dialogo}"` : '',
      `Product (must match IMAGE ${mapa.producto} exactly): ${sistema?.productoFijo || ''}. ${shot.product.position}. ${shot.product.interaction}. Show, hold or use the product only — never worn as a personal accessory.`,
      fidelidad.rule_1,
      fidelidad.rule_2,
      `Environment: ${shot.environment.location}. Lighting: ${shot.environment.lighting}.`,
      `Locked across every shot: ${bloqueo.consistency_rule || ''}`,
      `Avoid: ${NEGATIVE_PROMPT}.`,
    ].filter(Boolean);
    return partes.join(' ');
  }

  return JSON.stringify({
    // Lo primero que lee el modelo: que es cada imagen que le llega.
    reference_images: bloqueReferencias(mapa),
    shot_role: shot.rol || undefined,
    camera: {
      movement: movimiento,
      start_position: shot.camera?.start_position,
      end_position: shot.camera?.end_position,
      focal_length: shot.camera?.focal_length,
    },
    hook_visual: shot.hook_visual || undefined,
    subject: {
      description: shot.subject?.fixed_description,
      start_pose: shot.subject?.start_pose,
      action: shot.subject?.action,
      end_pose: shot.subject?.end_pose,
      dialogue: !sinDialogo && shot.subject?.dialogo ? shot.subject.dialogo : undefined,
    },
    product: {
      // La identidad canonica va aqui, no solo en el bloque de sistema: es el
      // campo que el modelo lee cuando decide como dibujar el producto.
      identity: sistema?.productoFijo,
      position: shot.product?.position,
      interaction: shot.product?.interaction,
      rule: 'show, hold, or use the product only — never worn or put on as a personal accessory',
    },
    product_fidelity: fidelidad,
    environment: {
      location: shot.environment?.location,
      lighting: shot.environment?.lighting,
    },
    ...bloqueo,
    ...(shot.correccion_fidelidad ? { fidelity_correction: shot.correccion_fidelidad } : {}),
    avoid: NEGATIVE_PROMPT,
  });
}

// Para las continuaciones: prompt corto tipo "continua...", SIN redescribir camara
// ni entorno completos, porque Kie ya tiene ese contexto visual del clip anterior.
// Redescribir todo hace que trate el clip como escena nueva (confirmado en prueba real).
function aplanarPromptExtend(shot, { sinDialogo = false, sistema, mapa = mapaDeReferencias({ conFrame: true }) } = {}) {
  const fidelidad = reglasDeFidelidad({ indiceImagenProducto: mapa.producto });

  if (!PROMPT_EN_JSON) {
    const partes = [
      `Continuing the shot: ${shot.subject.action}.`,
      !sinDialogo && shot.subject.dialogo ? `She/He says: "${shot.subject.dialogo}"` : '',
      shot.product.interaction
        ? `${shot.product.interaction}. Show or use the product only — never worn as a personal accessory.`
        : '',
      `The product is still the one in IMAGE ${mapa.producto}: ${sistema?.productoFijo || ''}. ${fidelidad.rule_2}`,
      `Avoid: ${NEGATIVE_PROMPT}.`,
    ].filter(Boolean);
    return partes.join(' ');
  }

  return JSON.stringify({
    reference_images: bloqueReferencias(mapa),
    shot_role: shot.rol || undefined,
    continuing_action: shot.subject?.action,
    camera_movement: describirMovimiento(shot.camera?.movement),
    dialogue: !sinDialogo && shot.subject?.dialogo ? shot.subject.dialogo : undefined,
    product_interaction: shot.product?.interaction || undefined,
    product_rule: 'show, hold, or use the product only — never worn or put on as a personal accessory',
    // Aunque sea continuacion, el sujeto y el producto se vuelven a fijar:
    // es barato en tokens y evita la deriva de identidad entre clips. El frame
    // anterior YA viene degradado, asi que la verdad del producto sigue siendo
    // la foto original, no el fotograma.
    locked_subject: sistema?.avatarFijo,
    locked_product: sistema?.productoFijo,
    product_fidelity: fidelidad,
    ...(shot.correccion_fidelidad ? { fidelity_correction: shot.correccion_fidelidad } : {}),
    avoid: NEGATIVE_PROMPT,
  });
}

/**
 * 3 intentos por shot. Desde el 2do se manda sin dialogo hablado, que es lo que
 * suele destrabar el filtro de audio de Kie. Si aun asi falla, el error sube con
 * codigo y taskId para poder recuperar lo que ya se cobro.
 */
async function generarConReintento(llamar, shot, { armarPrompt = aplanarPrompt, sistema, shotId, mapa } = {}) {
  const MAX_INTENTOS = 3;
  let ultimoError;
  let ultimoTaskId = null;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const sinDialogo = intento > 1;
      return await llamar(armarPrompt(shot, { sinDialogo, sistema, mapa }), (taskId) => {
        ultimoTaskId = taskId;
      });
    } catch (e) {
      ultimoError = clasificar(e, { shotId, taskId: ultimoTaskId });
      console.log(`[REINTENTO] Shot ${shotId} intento ${intento}/${MAX_INTENTOS} fallo (${ultimoError.codigo}): ${ultimoError.message}`);

      // Sin saldo no se arregla reintentando: corta ya.
      if (ultimoError.codigo === CODIGOS.INSUFFICIENT_CREDITS) throw ultimoError;
      if (intento < MAX_INTENTOS) await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw ultimoError;
}

/**
 * Genera un clip y COMPRUEBA que el producto siga siendo el mismo.
 *
 * Si cambio, se rehace UNA vez inyectando la correccion concreta que devolvio la
 * verificacion ("the label now reads X, it must read Y"). Una sola repeticion:
 * si a la segunda tampoco sale, se entrega el clip y se avisa, porque seguir
 * intentando es gastar el dinero del cliente a ciegas.
 */
async function generarClipFiel({
  llamar,
  shot,
  sistema,
  shotId,
  mapa,
  armarPrompt,
  productoUrl,
  avatarUrl,
  necesitaFrameFinal,
  onEstado,
}) {
  const resultado = await generarConReintento(llamar, shot, { armarPrompt, sistema, shotId, mapa });

  // Una sola descarga del clip y una sola pasada de ffmpeg para los dos frames:
  // el del medio (verificacion) y el ultimo (encadenar el siguiente clip).
  const momentos = necesitaFrameFinal ? ['medio', 'ultimo'] : ['medio'];
  const [frameMedio, frameFinal] = await extraerFrames(resultado.url, momentos);

  onEstado?.(`Verificando que el producto no haya cambiado (shot ${shotId})...`);
  const revision = await verificarFidelidad({ frameBuffer: frameMedio, productoUrl, avatarUrl });

  if (revision.fiel || !revision.verificado) {
    return { ...resultado, frameFinal, fidelidad: revision };
  }

  console.log(`[FIDELIDAD] Shot ${shotId} rompio la referencia:`, revision.fallos);
  onEstado?.(`El producto cambio en el shot ${shotId}. Rehaciendo...`);

  try {
    const shotCorregido = {
      ...shot,
      correccion_fidelidad: [
        `The previous attempt broke product fidelity: ${revision.fallos.join('; ')}.`,
        revision.correccion,
        `Regenerate matching IMAGE ${mapa.producto} exactly.`,
      ]
        .filter(Boolean)
        .join(' '),
    };

    const segundo = await generarConReintento(llamar, shotCorregido, { armarPrompt, sistema, shotId, mapa });
    const [medio2, final2] = await extraerFrames(segundo.url, momentos);
    const revision2 = await verificarFidelidad({ frameBuffer: medio2, productoUrl, avatarUrl });

    return {
      ...segundo,
      frameFinal: final2,
      // El costo del intento fallido tambien se le cobro al cliente: se suma.
      creditosDescartados: resultado.creditos ?? null,
      fidelidad: { ...revision2, rehecho: true, fallos_previos: revision.fallos },
    };
  } catch (e) {
    // Si el reintento falla, nos quedamos con el primer clip: existe y esta pagado.
    console.warn(`[FIDELIDAD] No se pudo rehacer el shot ${shotId}: ${e.message}`);
    return { ...resultado, frameFinal, fidelidad: { ...revision, rehecho: false, error_reintento: e.message } };
  }
}

// ─── Orquestacion ────────────────────────────────────────────────────────────

export async function correrVideoLargo(
  jobId,
  { apiKey, avatarUrl, productoUrl, producto = {}, duracionDeseadaSeg, idioma = 'es' }
) {
  const gasto = contadorDeGasto({ estimadoPorClipUsd: COSTO_CLIP_BASE });
  // Se acumulan aqui para poder limpiar SOLO los clips de este job al terminar.
  const clipsUrls = [];

  try {
    const { duracionFinal, segmentosTotales } = calcularClips(duracionDeseadaSeg);
    limpiarCache();

    // 0. Pre-vuelo: no arrancamos un video que no se puede terminar.
    actualizarJob(jobId, { mensaje: 'Revisando saldo...' });
    const preVuelo = await verificarSaldo({
      apiKey,
      proveedor: 'kie',
      costoEstimadoUsd: costoVideoLargo(duracionDeseadaSeg),
      etiqueta: `un video de ${duracionFinal}s (${segmentosTotales} clips)`,
    });
    actualizarJob(jobId, { saldo_previo: preVuelo.saldo, saldo_verificado: preVuelo.verificado });

    // 1. Identidad del producto y de la persona. Esto es lo que decide si el
    //    producto del video es el mismo de la foto.
    actualizarJob(jobId, { mensaje: 'Leyendo el producto en detalle...' });
    const [fichaVision, fijas] = await Promise.all([
      fichaForense({ imagenProducto: productoUrl, idioma }),
      descripcionFija({ avatarUrl, productoUrl }),
    ]);

    // Lo que escribio el vendedor manda sobre lo que dedujo la vision.
    const fichaProducto = fusionarContexto(fichaVision, producto);
    const productoFijo = identidadCanonica(fichaProducto);

    actualizarJob(jobId, {
      producto: fichaProducto,
      // Si la foto no dio para leer el producto, el cliente tiene que saberlo:
      // se genera igual, pero avisado.
      necesita_contexto: necesitaContexto(fichaProducto),
      falta_contexto: fichaProducto.falta_contexto,
    });

    if (necesitaContexto(fichaProducto)) {
      console.warn('[PH TikTok] Producto con contexto insuficiente:', fichaProducto.falta_contexto);
    }

    const sistema = construirSistemaDeDiseno({
      avatarFijo: fijas.avatar_fijo,
      productoFijo,
      entorno: fijas.entorno_sugerido,
      iluminacion: fijas.iluminacion_sugerida,
      idiomaDialogo: idioma === 'en' ? 'English' : idioma === 'pt' ? 'Portuguese' : 'Spanish',
    });

    // 2. Arco narrativo + camaras, antes de escribir una sola linea.
    const plan = planDeShots(segmentosTotales);
    actualizarJob(jobId, {
      mensaje: `Escribiendo guion de ${segmentosTotales} shots...`,
      sistema_diseno: sistema,
      plan_shots: plan.map(({ shot_id, rol, movimiento }) => ({ shot_id, rol, movimiento })),
    });

    let shots = await guionLargo({ producto: fichaProducto, duracionFinal, plan, idioma, sistema });

    // 3. Normalizacion antes de gastar: es gratis y evita reventar creditos.
    //    Casi todo se arregla en codigo; solo se molesta al LLM si queda algo
    //    que de verdad hay que reescribir.
    const normalizado = normalizarShots(shots, sistema, plan);
    shots = normalizado.shots;
    if (normalizado.arreglados.length) {
      console.log(`[CONSISTENCIA] Arreglado en codigo: ${normalizado.arreglados.join(', ')}`);
    }

    if (normalizado.fallos.length) {
      console.log(`[CONSISTENCIA] ${normalizado.fallos.length} fallos que requieren reescritura:`, normalizado.fallos.map((f) => f.regla));
      actualizarJob(jobId, { mensaje: 'Corrigiendo el guion...' });
      shots = normalizarShots(
        await repararGuion({ shots, fallos: normalizado.fallos, sistema }),
        sistema,
        plan
      ).shots;
    }

    // 4. Clip base. El orden de las imagenes DEBE coincidir con el mapa que se
    //    le declara al modelo en el prompt.
    actualizarJob(jobId, { mensaje: `Generando shot 1 de ${segmentosTotales} (${plan[0].rol}, ${CLIP_BASE}s)...` });
    const refsBase = armarReferencias({ avatarUrl, productoUrl });

    const base = await generarClipFiel({
      llamar: (prompt, onTask) =>
        generarVideo(
          { modelo: 'veo3_fast', modo: 'REFERENCE_2_VIDEO', prompt, imagenes: refsBase.imagenes },
          apiKey,
          { onRequestId: onTask }
        ),
      shot: { ...shots[0], rol: plan[0].rol },
      sistema,
      shotId: '1',
      mapa: refsBase.mapa,
      productoUrl,
      avatarUrl,
      necesitaFrameFinal: segmentosTotales > 1,
      onEstado: (m) => actualizarJob(jobId, { mensaje: m }),
    });

    let frameFinal = base.frameFinal;
    clipsUrls.push(base.url);
    const clips = [
      { shot_id: '1', rol: plan[0].rol, url: base.url, taskId: base.requestId, fidelidad: base.fidelidad },
    ];
    gasto.registrar(base.creditos);
    if (base.creditosDescartados != null) gasto.registrar(base.creditosDescartados);
    console.log(`[DIAG] Segmento 1 (base) -> taskId=${base.requestId} url=${base.url}`);

    // 5. Continuaciones encadenadas por el ultimo frame, que ya viene extraido
    //    del paso anterior: no se vuelve a descargar el clip.
    for (let i = 1; i < segmentosTotales; i++) {
      const rol = plan[i].rol;
      actualizarJob(jobId, {
        mensaje: `Generando shot ${i + 1} de ${segmentosTotales} (${rol}, ~${CLIP_BASE * i}s hechos)...`,
      });

      const frameUrl = await subirConCache(frameFinal, {
        apiKey,
        proveedor: 'kie',
        nombre: `ph-frame-${i}.png`,
      });

      const refs = armarReferencias({ avatarUrl, productoUrl, frameUrl });

      const ext = await generarClipFiel({
        llamar: (prompt, onTask) =>
          generarVideo(
            { modelo: 'veo3_fast', modo: 'REFERENCE_2_VIDEO', prompt, imagenes: refs.imagenes },
            apiKey,
            { onRequestId: onTask }
          ),
        shot: { ...shots[i], rol },
        armarPrompt: aplanarPromptExtend,
        sistema,
        shotId: String(i + 1),
        mapa: refs.mapa,
        productoUrl,
        avatarUrl,
        necesitaFrameFinal: i < segmentosTotales - 1,
        onEstado: (m) => actualizarJob(jobId, { mensaje: m }),
      });

      frameFinal = ext.frameFinal;
      clipsUrls.push(ext.url);
      clips.push({ shot_id: String(i + 1), rol, url: ext.url, taskId: ext.requestId, fidelidad: ext.fidelidad });
      gasto.registrar(ext.creditos);
      if (ext.creditosDescartados != null) gasto.registrar(ext.creditosDescartados);
      console.log(`[DIAG] Segmento ${i + 1} (extend) -> taskId=${ext.requestId} url=${ext.url}`);

      actualizarJob(jobId, { clips });
    }

    // 6. Union.
    actualizarJob(jobId, { mensaje: 'Uniendo los clips en un solo video...' });
    const videoFinalBuffer = await unirClips(clipsUrls);
    const videoFinalUrl = await subirConCache(videoFinalBuffer, {
      apiKey,
      proveedor: 'kie',
      nombre: 'ph-video-final.mp4',
      tipo: 'video/mp4',
    });

    // 7. Post-produccion: portada y texto del post. Nunca bloquean la entrega.
    actualizarJob(jobId, { mensaje: 'Sacando portada y escribiendo el caption...' });
    const [portadaUrl, texto] = await Promise.all([
      generarPortada({ videoUrl: clipsUrls[0], apiKey }),
      generarCaption({ producto, shots, idioma }),
    ]);

    const total = gasto.total;
    actualizarJob(jobId, {
      estado: 'terminado',
      mensaje: 'Video largo listo.',
      videoUrl: videoFinalUrl,
      portadaUrl,
      caption: texto.caption,
      hashtags: texto.hashtags,
      clips,
      duracionFinal,
      costo_real: total.usd,
      costo_creditos: total.creditos,
      costo_exacto: total.exacto,
      aviso: 'Descarga el video hoy: las URLs del proveedor caducan.',
    });

    return { videoUrl: videoFinalUrl, duracionFinal, costo: total.usd };
  } catch (e) {
    const err = clasificar(e);
    const total = gasto.total;
    console.error(`[PH TikTok] Video largo fallido (${err.codigo}):`, err.message);

    actualizarJob(jobId, {
      estado: 'error',
      mensaje: `Fallo generando el video largo: ${err.message}`,
      error: err.aJSON(),
      // Lo gastado hasta el fallo: el cliente tiene derecho a saberlo.
      costo_real: total.usd,
      costo_creditos: total.creditos,
    });
    throw err;
  } finally {
    // Los MP4 en disco solo sirven durante el job. Si no se borran, cada video
    // deja decenas de MB en el contenedor.
    limpiarClips(clipsUrls);
  }
}
