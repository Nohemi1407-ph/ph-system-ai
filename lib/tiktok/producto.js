/**
 * PH TikTok Shop Engine — IDENTIDAD DEL PRODUCTO
 * -----------------------------------------------------------------------------
 * Este archivo existe por UNA razon: que el producto del video sea el MISMO
 * producto de la foto. Ni parecido. El mismo.
 *
 * Por que se rediseñaba antes:
 *
 *   El sistema le pasaba al modelo de video una sola frase generica del tipo
 *   "a blue skincare bottle". Con eso, Veo tiene permiso total para inventar la
 *   etiqueta, la tapa, las proporciones y hasta la marca. No estaba fallando el
 *   modelo: le estabamos dando libertad.
 *
 * Que hace este modulo:
 *
 *   1. FICHA FORENSE. Lee la foto y extrae la identidad del producto con nivel
 *      de detalle de perito: texto literal de la etiqueta, colores, material,
 *      cierre, proporciones, marcas distintivas. Cuanto mas cerrada la
 *      descripcion, menos espacio para inventar.
 *
 *   2. DECLARA LO QUE NO PUEDE VER. Si la foto no deja leer la etiqueta o no se
 *      entiende que es el producto, lo dice en `falta_contexto` en vez de
 *      inventarselo. Eso es lo que alimenta la seccion de contexto manual.
 *
 *   3. IDENTIDAD CANONICA. Una sola cadena en ingles que se repite LITERAL en
 *      todos los shots. No se reescribe nunca, ni entre clips ni entre videos.
 *
 *   4. VERIFICACION. Despues de generar, compara un frame del clip contra la
 *      foto original. Si el producto cambio, el clip se rehace. Es la unica
 *      forma de garantizar fidelidad: comprobarla, no pedirla.
 */

import { completarJSON } from './llm.js';

// ffmpeg solo hace falta para la verificacion visual del final del archivo.
// Se carga bajo demanda para que la ficha y la identidad canonica (que son
// funciones puras) no arrastren binarios de video.

// ─── 1. Ficha forense ────────────────────────────────────────────────────────

const PROMPT_FICHA = `Eres un perito que documenta un producto para que un modelo de video lo reproduzca IDENTICO. No eres publicista: no adornas, no interpretas, no rellenas huecos.

Regla numero uno: si algo no se ve con claridad en la foto, NO lo inventes. Ponlo en "falta_contexto" y deja el campo vacio. Una etiqueta inventada arruina el video entero.

Devuelve SOLO este JSON:
{
  "identidad": {
    "tipo": "exactamente que objeto es, en ingles (ej: 'opaque plastic pump bottle', 'foil sachet', 'glass jar with metal lid')",
    "color_principal": "nombre + hex aproximado, en ingles (ej: 'matte sage green #8FA98A')",
    "colores_secundarios": ["mismo formato, solo los que existan"],
    "texto_etiqueta": ["cada linea de texto legible, TRANSCRITA LITERAL tal como aparece, respetando mayusculas. Vacio si no se lee."],
    "marca_visible": "nombre de marca si es legible, si no cadena vacia",
    "forma": "geometria y silueta en ingles (ej: 'tall cylinder, straight walls, rounded shoulders')",
    "material_acabado": "en ingles (ej: 'matte soft-touch plastic, no gloss')",
    "tapa_cierre": "en ingles (ej: 'white ribbed pump with clear overcap'), vacio si no aplica",
    "proporciones": "tamano relativo a una mano adulta, en ingles (ej: 'about the height of an adult palm')",
    "detalles_distintivos": ["cualquier detalle que lo distinga de un producto generico: relieve, franja, icono, ventana transparente, sello"]
  },
  "legibilidad": "alta|media|baja",
  "falta_contexto": ["lista, EN ESPANOL, de lo que no pudiste determinar de la foto y el vendedor deberia escribir a mano"],
  "nombre": "nombre comercial corto si se deduce, si no cadena vacia",
  "descripcion": "que es y que hace, 1 frase en espanol. Vacio si la foto no lo permite deducir.",
  "beneficio": "el beneficio principal MOSTRABLE en video, en espanol. Vacio si no se deduce.",
  "publico": "quien lo compra en TikTok Shop, en espanol. Vacio si no se deduce.",
  "categoria": "belleza|salud|hogar|cocina|electronica|mascotas|moda|bebe|fitness|otro",
  "momento_satisfactorio": "el instante visual mas vendedor del producto en uso, en espanol",
  "riesgo_compliance": "bajo|medio|alto"
}`;

/**
 * Lee la foto del producto y devuelve su ficha forense.
 * Si no hay foto o la vision falla, devuelve una ficha vacia marcada como que
 * necesita contexto manual: el sistema NO debe seguir adelante inventando.
 */
export async function fichaForense({ imagenProducto, idioma = 'es' }) {
  if (!imagenProducto) {
    return fichaVacia(['No se subio foto del producto: todo el contexto tiene que venir escrito.']);
  }

  try {
    const ficha = await completarJSON({
      system: 'Documentas productos con precision forense para reproduccion visual exacta. Devuelves solo JSON.',
      user: PROMPT_FICHA,
      imagenes: [imagenProducto],
      maxTokens: 1200,
    });

    return normalizar(ficha);
  } catch (e) {
    console.warn('[PH TikTok] No se pudo leer la foto del producto:', e.message);

    // Distinguir "la foto no da para leer el producto" de "el motor de texto no
    // responde" es importante: en el primer caso escribir el contexto a mano
    // arregla el video; en el segundo NO arregla nada, porque el guionista
    // tambien necesita el modelo. Decirle a alguien que escriba a mano cuando
    // eso no va a servir es hacerle perder el tiempo.
    return {
      ...fichaVacia([`El motor de texto no respondio: ${e.message}`]),
      error_motor: e.message,
    };
  }
}

function fichaVacia(motivos) {
  return normalizar({ legibilidad: 'baja', falta_contexto: motivos });
}

function normalizar(ficha = {}) {
  const id = ficha.identidad || {};
  return {
    identidad: {
      tipo: id.tipo || '',
      color_principal: id.color_principal || '',
      colores_secundarios: Array.isArray(id.colores_secundarios) ? id.colores_secundarios : [],
      texto_etiqueta: Array.isArray(id.texto_etiqueta) ? id.texto_etiqueta.filter(Boolean) : [],
      marca_visible: id.marca_visible || '',
      forma: id.forma || '',
      material_acabado: id.material_acabado || '',
      tapa_cierre: id.tapa_cierre || '',
      proporciones: id.proporciones || '',
      detalles_distintivos: Array.isArray(id.detalles_distintivos) ? id.detalles_distintivos.filter(Boolean) : [],
    },
    legibilidad: ['alta', 'media', 'baja'].includes(ficha.legibilidad) ? ficha.legibilidad : 'baja',
    falta_contexto: Array.isArray(ficha.falta_contexto) ? ficha.falta_contexto.filter(Boolean) : [],
    nombre: ficha.nombre || '',
    descripcion: ficha.descripcion || '',
    beneficio: ficha.beneficio || '',
    publico: ficha.publico || '',
    categoria: ficha.categoria || 'otro',
    momento_satisfactorio: ficha.momento_satisfactorio || '',
    riesgo_compliance: ficha.riesgo_compliance || 'bajo',
  };
}

// ─── 2. Fusion con el contexto que escribe el vendedor ───────────────────────

/**
 * Lo que el vendedor escribe SIEMPRE gana sobre lo que dedujo la IA.
 * El vendedor conoce su producto; la vision solo lo esta mirando.
 */
export function fusionarContexto(ficha, manual = {}) {
  const limpio = Object.fromEntries(
    Object.entries(manual).filter(([, v]) => String(v ?? '').trim().length > 0)
  );

  const fusionada = { ...ficha, ...limpio };

  // El texto de etiqueta escrito a mano manda: es el dato que mas se inventa.
  if (limpio.texto_etiqueta) {
    fusionada.identidad = {
      ...ficha.identidad,
      texto_etiqueta: String(limpio.texto_etiqueta)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    };
    delete fusionada.texto_etiqueta;
  }

  if (limpio.marca) {
    fusionada.identidad = { ...(fusionada.identidad || ficha.identidad), marca_visible: limpio.marca };
    delete fusionada.marca;
  }

  // Con contexto escrito, lo que faltaba deja de faltar.
  const cubiertos = ['nombre', 'descripcion', 'beneficio', 'texto_etiqueta', 'marca'].filter((k) => limpio[k]);
  if (cubiertos.length) {
    fusionada.falta_contexto = (ficha.falta_contexto || []).filter(
      (f) => !cubiertos.some((c) => f.toLowerCase().includes(c))
    );
  }

  return fusionada;
}

/** ¿Se puede generar con garantias, o hace falta que el vendedor escriba? */
export function necesitaContexto(ficha) {
  if (!ficha) return true;
  const sinIdentidad = !ficha.identidad?.tipo && !ficha.descripcion;
  return sinIdentidad || (ficha.legibilidad === 'baja' && !ficha.descripcion);
}

// ─── 3. Identidad canonica (la cadena que se repite en TODOS los shots) ──────

/**
 * Construye la descripcion bloqueada del producto, en ingles, que se inyecta
 * LITERAL en cada prompt. No se reescribe nunca: si cambia entre shots, el
 * producto cambia en pantalla.
 */
export function identidadCanonica(ficha) {
  const id = ficha?.identidad || {};
  const partes = [];

  if (id.tipo) partes.push(id.tipo);
  if (id.color_principal) partes.push(`main color ${id.color_principal}`);
  if (id.colores_secundarios?.length) partes.push(`secondary colors ${id.colores_secundarios.join(', ')}`);
  if (id.material_acabado) partes.push(id.material_acabado);
  if (id.forma) partes.push(id.forma);
  if (id.tapa_cierre) partes.push(`closure: ${id.tapa_cierre}`);
  if (id.proporciones) partes.push(id.proporciones);
  if (id.marca_visible) partes.push(`brand mark reads "${id.marca_visible}"`);
  if (id.texto_etiqueta?.length) {
    partes.push(`label text reads exactly: ${id.texto_etiqueta.map((t) => `"${t}"`).join(' / ')}`);
  }
  if (id.detalles_distintivos?.length) partes.push(`distinctive details: ${id.detalles_distintivos.join('; ')}`);

  if (!partes.length) {
    // Sin ficha, lo unico honesto es mandar al modelo a copiar la imagen.
    return 'the exact product shown in the product reference image — copy it pixel for pixel, do not redesign it';
  }

  return partes.join(', ');
}

/**
 * Bloque de reglas duras que acompana a la identidad canonica en cada prompt.
 * Se manda VERBATIM: es la instruccion mas importante de todo el sistema.
 */
export function reglasDeFidelidad({ indiceImagenProducto }) {
  const ref = indiceImagenProducto != null ? `reference IMAGE ${indiceImagenProducto}` : 'the product reference image';
  return {
    product_reference: ref,
    rule_1: `The product in this shot IS the product in ${ref}. Reproduce it pixel-faithfully: same shape, same proportions, same colors, same finish, same closure, same label artwork and same label text.`,
    rule_2: 'Do NOT redesign, restyle, rebrand, recolor, simplify or "improve" the product. Do NOT invent label text, logos or packaging that is not in the reference.',
    rule_3: 'If any part of the product is not visible in the reference, keep it plain and neutral — never invent decoration.',
    rule_4: 'The product must stay identical across every shot of this video. No drift between clips.',
  };
}

/**
 * Arma el array de imagenes de referencia y el mapa de indices A LA VEZ, para
 * que el indice que se le declara al modelo sea siempre el real.
 *
 * Antes se hacia `[avatar, frame, producto].filter(Boolean)`: si faltaba una
 * imagen, todo lo de detras se corria de posicion y el modelo acababa tratando
 * como producto lo que no lo era.
 */
export function armarReferencias({ avatarUrl, productoUrl, frameUrl }) {
  const imagenes = [];
  const mapa = {};

  if (avatarUrl) {
    imagenes.push(avatarUrl);
    mapa.persona = imagenes.length;
  }
  if (frameUrl) {
    imagenes.push(frameUrl);
    mapa.frameAnterior = imagenes.length;
  }
  if (productoUrl) {
    imagenes.push(productoUrl);
    mapa.producto = imagenes.length;
  }

  return { imagenes, mapa };
}

// ─── 4. Verificacion: comprobar la fidelidad, no confiar en ella ─────────────

const VERIFICAR = process.env.PH_VERIFICAR_FIDELIDAD !== 'false';

/**
 * Compara un frame del clip generado contra la foto original del producto.
 *
 * Cuesta una llamada de vision (centimos) frente a un clip de video (dolares),
 * asi que sale a cuenta incluso si solo salva un clip de cada diez.
 *
 * Ante la duda dice que es fiel: preferimos dejar pasar un clip dudoso antes
 * que rehacer uno bueno y cobrarselo al cliente dos veces.
 */
export async function verificarFidelidad({ videoUrl, frameBuffer, productoUrl, avatarUrl }) {
  if (!VERIFICAR || !productoUrl || (!videoUrl && !frameBuffer)) {
    return { fiel: true, verificado: false, fallos: [] };
  }

  try {
    // Lo normal es recibir el frame ya extraido por quien genero el clip: asi no
    // se vuelve a descargar el MP4 solo para verificarlo.
    let buffer = frameBuffer;
    if (!buffer) {
      const { extraerFrame } = await import('./media.js');
      buffer = await extraerFrame(videoUrl, 'medio');
    }

    // El frame va inline como data URI. Subirlo a Kie para que el LLM lo
    // descargue otra vez eran dos viajes de red por clip, para nada.
    const frameInline = `data:image/png;base64,${buffer.toString('base64')}`;

    const imagenes = [productoUrl, frameInline];
    if (avatarUrl) imagenes.push(avatarUrl);

    const r = await completarJSON({
      system:
        'Comparas imagenes para control de calidad. Eres estricto con el producto y tolerante con el encuadre. Devuelves solo JSON.',
      user: `IMAGEN 1: la foto original del producto (la verdad).
IMAGEN 2: un fotograma de un video generado que deberia mostrar ESE MISMO producto.${
        avatarUrl ? '\nIMAGEN 3: la foto original de la persona.' : ''
      }

Compara el PRODUCTO de la imagen 2 contra el de la imagen 1. Ignora diferencias de angulo, iluminacion, distancia, encuadre, desenfoque o que este parcialmente tapado por la mano: eso es normal en video.

Marca como fallo SOLO cambios reales de identidad del producto: otro color, otra forma, otra tapa, otra etiqueta, texto o logo distinto o inventado, otro tipo de envase.
${avatarUrl ? 'Comprueba tambien que la persona de la imagen 2 sea la misma que la de la imagen 3 (mismo rostro, pelo y ropa).\n' : ''}
Si el producto no se ve o se ve demasiado poco para juzgar, responde fiel=true y visible=false. Ante la duda, fiel=true.

{
  "fiel": true,
  "visible": true,
  "fallos": ["cada cambio real de identidad, en espanol y concreto"],
  "correccion": "instruccion EN INGLES para el modelo de video que corrija exactamente lo que cambio, vacio si es fiel"
}`,
      imagenes,
      maxTokens: 500,
    });

    return {
      fiel: r.fiel !== false,
      visible: r.visible !== false,
      verificado: true,
      fallos: Array.isArray(r.fallos) ? r.fallos.filter(Boolean) : [],
      correccion: r.correccion || '',
    };
  } catch (e) {
    console.warn('[PH TikTok] No se pudo verificar la fidelidad:', e.message);
    return { fiel: true, verificado: false, fallos: [] };
  }
}
