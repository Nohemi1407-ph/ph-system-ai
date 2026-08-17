/**
 * PH TikTok Shop Engine — CONSTRUCTOR DE PROMPTS
 * -----------------------------------------------------------------------------
 * Traduce el conocimiento VIVO (base + PDFs del cliente) a instrucciones.
 * El guionista no improvisa la estructura: la recibe cerrada.
 */

import { getKnowledge } from './knowledgeStore.js';

const IDIOMAS = {
  es: 'español latino neutro, como habla la gente en TikTok (con muletillas naturales)',
  en: 'US English, casual TikTok creator voice (contractions, filler words, no ad-speak)',
  pt: 'português brasileiro coloquial de TikTok',
};

export const IDIOMAS_DISPONIBLES = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
  { id: 'pt', nombre: 'Português' },
  { id: 'mixto', nombre: 'Español + English (mitad y mitad)' },
];

export function systemPromptGuionista({ idioma = 'es' } = {}) {
  const K = getKnowledge();

  const notas = K.NOTAS_DEL_CLIENTE.length
    ? `\n═══ NOTAS DEL CLIENTE (mandan sobre todo lo anterior) ═══\n${K.NOTAS_DEL_CLIENTE.map((n) => `· ${n}`).join('\n')}\n`
    : '';

  return `Eres el guionista principal de una operación de TikTok Shop que factura por conversión, no por vistas.

Tu trabajo NO es escribir anuncios. Es escribir contenido que parezca de un creador real, que retenga, y que haga que la gente compre casi sin darse cuenta de que le vendieron.

═══ ESTRUCTURA OBLIGATORIA (no negociable) ═══
${K.ESTRUCTURA_BASE.map(
  (b, i) => `${i + 1}. ${(b.nombre || b.beat || '').toUpperCase()} — ${b.objetivo || ''}
   ${(b.reglas || []).map((r) => `· ${r}`).join('\n   ')}`
).join('\n')}

═══ REGLAS DURAS ═══
${K.REGLAS_DURAS.map((r) => `· ${r}`).join('\n')}

═══ CTA ═══
Permitidos (o variantes con el mismo espíritu): ${K.CTA_NATURALES.join(' / ')}
PROHIBIDOS: ${K.CTA_PROHIBIDOS.join(', ')}

═══ CUMPLIMIENTO TIKTOK SHOP ═══
Nunca uses ni insinúes: ${K.COMPLIANCE.frases_prohibidas.join(', ')}.
${K.COMPLIANCE.reglas.map((r) => `· ${r}`).join('\n')}
Categorías sensibles:
${Object.entries(K.COMPLIANCE.categorias_sensibles).map(([k, v]) => `· ${k}: ${v}`).join('\n')}
${notas}
═══ IDIOMA DEL DIÁLOGO ═══
${IDIOMAS[idioma] || IDIOMAS.es}

═══ FIDELIDAD VISUAL (crítico, no negociable) ═══
Cuando escribas cualquier "prompt_video" o "prompt_frame", el avatar (referencia 1) y el producto (referencia 2) deben aparecer como RÉPLICA EXACTA de sus fotos: mismo rostro, mismo peinado, misma ropa para la persona; mismo color, misma etiqueta, misma forma y mismo empaque para el producto. El modelo debe COPIAR las referencias, NUNCA reinterpretarlas, rediseñarlas ni cambiar marca/color/texto. Incluye siempre en el prompt de video una frase explícita tipo "the product must be an exact replica of reference image 2 — same color, same label, same shape, do not redesign it" y "keep the person identical to reference image 1". Esta es una causa frecuente de rechazo del cliente: el producto o la cara cambian entre tomas.

═══ FORMATO DE SALIDA ═══
Devuelves EXCLUSIVAMENTE un objeto JSON válido. Sin markdown, sin backticks, sin texto antes ni después.`;
}

/** Prompt de usuario para UNA variación. */
export function promptVariacion({
  producto,
  avatar,
  variacion,
  duracion = 8,
  idioma = 'es',
  referenciaDirecta = false,
  productoFijo = '',
}) {
  const K = getKnowledge();
  const beats = K.beatsConTiempos(duracion);
  const familia = K.FAMILIAS_HOOK[variacion.familia_hook] || {};
  const estrategia = K.ESTRATEGIAS[variacion.estrategia] || {};

  const herencia = variacion.inspirada_en
    ? `\n═══ MODO ITERACIÓN ═══
Esta variación se inspira en un video que YA funcionó.
Lo que funcionó: ${variacion.inspirada_en.que_funciono}
${variacion.inspirada_en.hook_original ? `Hook original: "${variacion.inspirada_en.hook_original}"` : ''}
Conserva el mecanismo que funcionó, pero cambia hook, escenario y diálogo. NO lo repitas.\n`
    : '';

  // Con referencia directa el motor recibe avatar y producto como materiales,
  // sin imagen intermedia. El prompt de video tiene que describir la escena entera.
  const instruccionVisual = referenciaDirecta
    ? `"prompt_video": "Prompt EN INGLÉS para el motor de video, que recibe DOS imágenes de referencia: (1) la persona, (2) el producto. Describe: la persona de la referencia 1 (idéntica: mismo rostro, pelo, ropa) en el escenario '${variacion.escenario}', usando/sosteniendo el producto EXACTO de la referencia 2 (réplica exacta: mismo color, misma etiqueta, misma forma, mismo empaque, sin rediseñar). Incluye literalmente: 'the product must be an exact replica of reference image 2, same color, same label, same shape, do not change or redesign it; keep the person identical to reference image 1'. Acción beat por beat, movimiento de cámara, audio ambiente, y el diálogo textual entre comillas precedido por 'She says:' o 'He says:'. Vertical 9:16, una sola toma continua."`
    : `"prompt_frame": "Prompt EN INGLÉS para el generador de imagen: la persona de la referencia 1 en el escenario '${variacion.escenario}', sosteniendo/usando el producto de la referencia 2. Vertical 9:16, foto de celular, luz natural, sin retoque, UGC real. Cara visible, sin texto.",
  "prompt_video": "Prompt EN INGLÉS para animar ese frame. Acción beat por beat, cámara, audio ambiente y el diálogo textual entre comillas con 'She says:' o 'He says:'. Vertical, una sola toma continua."`;

  return `PRODUCTO
Nombre: ${producto.nombre || 'sin nombre'}
Qué es: ${producto.descripcion || 'ver imagen de referencia'}
Beneficio principal: ${producto.beneficio || 'el más obvio al verlo'}
Público: ${producto.publico || 'usuario general de TikTok Shop'}
Precio/oferta: ${producto.oferta || 'no mencionar precio'}
Categoría: ${producto.categoria || 'general'}
Momento más vendedor: ${producto.momento_satisfactorio || 'el instante en que se ve el resultado'}
${producto.notas ? `Notas del vendedor (mandan sobre todo lo demás): ${producto.notas}` : ''}
${
  producto.identidad?.texto_etiqueta?.length
    ? `Texto REAL de la etiqueta: ${producto.identidad.texto_etiqueta.join(' / ')}. Puedes apoyarte en él, pero NUNCA inventes texto de etiqueta que no esté en esta lista.`
    : ''
}
${
  productoFijo
    ? `\n═══ IDENTIDAD VISUAL EXACTA DEL PRODUCTO (copiar literal en el prompt de video) ═══
${productoFijo}
Esta descripción se incluye TAL CUAL en "prompt_video" (y en "prompt_frame" si existe). No la resumas, no la reescribas, no la adornes: es lo único que impide que el modelo rediseñe el producto.`
    : ''
}

AVATAR (la persona que aparece en el video)
${avatar.descripcion || 'Ver imagen de referencia. Persona real, natural, sin maquillaje de estudio.'}
${avatar.tono ? `Tono de voz: ${avatar.tono}` : ''}
${herencia}
═══ COORDENADAS DE ESTA VARIACIÓN (obligatorias) ═══
Familia de hook: ${familia.nombre || variacion.familia_hook} — ${familia.intencion || ''}
  Plantillas de referencia (inspírate, NO copies literal): ${(familia.plantillas || []).join(' | ')}
  Guía visual: ${familia.visual || '—'}
Estrategia: ${estrategia.nombre || variacion.estrategia} — ${estrategia.directriz || ''}
Ángulo de venta: ${variacion.angulo_venta}
Emoción dominante: ${variacion.emocion}
Escenario: ${variacion.escenario}
Ritmo: ${variacion.ritmo}
Tipo de historia: ${variacion.tipo_historia}
CTA base (puedes reformularlo con el mismo espíritu): "${variacion.cta_sugerido}"
El CTA final SIEMPRE debe mencionar el carrito o bolsa de compras NARANJA que TikTok Shop pone en pantalla (elemento real de la interfaz, no inventado), invitando a darle click ahí. Ejemplos de tono (adaptar al idioma y al producto, NO copiar literal): "tiene oferta especial, picale en el carrito naranja" / "checalo, tiene descuento, dale click a la bolsita naranja". Si el idioma del diálogo es distinto al español, traduce el concepto naturalmente, sin sonar forzado.

═══ TIEMPOS ═══
Duración total: ${duracion}s en un solo plano continuo.
${beats.map((b) => `${b.ventana} → ${b.nombre}`).join('\n')}
El diálogo completo debe caber HABLADO en ${duracion} segundos: máximo ${Math.round(duracion * 2.6)} palabras. Cuéntalas.
OBLIGATORIO incluso en duraciones cortas: los 5 beats (hook, problema, solucion, demostracion, cta) deben estar completos y con diálogo real, nunca vacíos ni cortados a mitad de frase. Si el tiempo aprieta, resume cada beat a 1 frase corta — nunca omitas el CTA ni lo dejes a medias.

═══ DEVUELVE ESTE JSON ═══
{
  "hook": "la frase exacta de los primeros segundos",
  "dialogo": "el diálogo completo y corrido, de principio a fin, incluyendo el CTA al final",
  "beats": [
    { "beat": "hook", "dialogo": "...", "accion": "qué hace y qué se ve", "camara": "encuadre / movimiento" },
    { "beat": "problema", "dialogo": "...", "accion": "...", "camara": "..." },
    { "beat": "solucion", "dialogo": "...", "accion": "...", "camara": "..." },
    { "beat": "demostracion", "dialogo": "...", "accion": "...", "camara": "..." },
    { "beat": "cta", "dialogo": "...", "accion": "...", "camara": "..." }
  ],
  ${instruccionVisual},
  "texto_en_pantalla": ["máximo 2 textos cortos tipo subtítulo de TikTok"],
  "caption": "el texto del post, corto, sin sonar a anuncio",
  "hashtags": ["4 a 6 hashtags relevantes"],
  "por_que_funciona": "1 frase: el mecanismo psicológico que hace que este video retenga",
  "cumplimiento": { "riesgo": "bajo|medio|alto", "notas": "qué se evitó o qué revisar" },
  "palabras_dialogo": 0
}`;
}

// La lectura de la foto del producto vive ahora en lib/tiktok/producto.js.
// Se saco de aqui a proposito: la ficha generica que habia ("nombre corto y
// comercial", "1 frase") es la que dejaba al modelo de video inventarse la
// etiqueta y el envase. Una sola fuente de verdad, y que sea la forense.

/**
 * Prompt para digerir los PDFs del cliente y convertirlos en conocimiento.
 * Esto es lo que hace que el software "agarre" la estructura del cliente.
 */
export function promptExtraccionConocimiento() {
  return `Este documento contiene el método de creación de videos de un operador de TikTok Shop.

Extrae TODO lo que sea instrucción operativa y devuélvelo como JSON. No resumas ni interpretes: transcribe la regla tal como el documento la plantea, en español.

Reglas de extracción:
- Si el documento define una estructura de video, mapéala a "estructura_base".
- Si da ejemplos de hooks, guárdalos como "plantillas" dentro de su familia. Crea familias nuevas si el documento las nombra.
- Si prohíbe frases, van a cta_prohibidos o compliance.frases_prohibidas según corresponda.
- Si algo no aparece en el documento, omite esa clave. NO inventes.

{
  "resumen": "1 frase de qué trae este documento",
  "estructura_base": [
    { "beat": "id_corto_sin_espacios", "nombre": "Nombre", "peso": 0.2, "objetivo": "para qué sirve este beat", "reglas": ["..."] }
  ],
  "familias_hook": {
    "id_familia": { "nombre": "Nombre", "intencion": "qué logra", "plantillas": ["ejemplo literal del documento"], "visual": "guía visual" }
  },
  "estrategias": {
    "id_estrategia": { "nombre": "Nombre", "directriz": "cómo se aplica", "marcas": ["señales de que está bien hecha"] }
  },
  "ejes_variacion": {
    "emocion": [], "escenario": [], "ritmo": [], "angulo_venta": [], "tipo_historia": []
  },
  "cta_naturales": ["..."],
  "cta_prohibidos": ["..."],
  "reglas_duras": ["reglas que aplican a TODOS los videos"],
  "compliance": {
    "frases_prohibidas": ["..."],
    "categorias_sensibles": { "categoria": "cómo tratarla" },
    "reglas": ["..."]
  },
  "notas_del_cliente": ["cualquier instrucción importante que no encaje arriba"]
}

Devuelve SOLO el JSON.`;
}

/**
 * Bloque de fidelidad que se anexa a TODO prompt que genere imagen o video.
 *
 * Es el texto mas importante del sistema: sin el, el modelo trata la foto del
 * producto como "inspiracion" y devuelve un producto parecido pero distinto,
 * que es exactamente lo que el cliente rechaza.
 */
function bloqueFidelidad({ productoFijo, mapa = {} }) {
  const refProducto = mapa.producto ? `reference IMAGE ${mapa.producto}` : 'the product reference image';
  const refPersona = mapa.persona ? `reference IMAGE ${mapa.persona}` : 'the person reference image';

  const lineas = [];

  // Decirle que es cada imagen: si no lo sabe, lo adivina, y a veces mal.
  if (mapa.persona || mapa.producto) {
    const mapaTexto = [];
    if (mapa.persona) mapaTexto.push(`IMAGE ${mapa.persona} = the person`);
    if (mapa.frameAnterior) mapaTexto.push(`IMAGE ${mapa.frameAnterior} = previous clip's last frame (continuity only)`);
    if (mapa.producto) mapaTexto.push(`IMAGE ${mapa.producto} = the product`);
    lineas.push(`Reference images: ${mapaTexto.join('; ')}.`);
  }

  if (productoFijo) {
    lineas.push(`The product is exactly this: ${productoFijo}.`);
  }

  lineas.push(
    `The product must be a pixel-faithful replica of ${refProducto}: same shape, same proportions, same colors, same finish, same closure, same label artwork and same label text.`,
    'Do NOT redesign, restyle, rebrand, recolor, simplify or "improve" the product. Do NOT invent label text, logos or packaging that is not in the reference.',
    'If part of the product is not visible in the reference, keep it plain and neutral — never invent decoration.',
    `Keep the person identical to ${refPersona}: same face, same hair, same clothing.`
  );

  return lineas.join('\n');
}

/** Refuerzos técnicos que se anexan al prompt de video antes de enviarlo. */
export function reforzarPromptVideo(promptVideo, { duracion, productoFijo, mapa } = {}) {
  const K = getKnowledge();
  return [
    promptVideo,
    bloqueFidelidad({ productoFijo, mapa }),
    `Vertical 9:16 format, about ${duracion} seconds, single continuous shot.`,
    'Shot on a phone camera, handheld, natural imperfect lighting, authentic UGC look. Not a commercial, not a studio ad.',
    'Natural room tone audio. No background music, no voice-over narrator.',
    `Keep the subject's face and the product inside the center safe area (avoid the top ${K.SPEC_TECNICA.safe_zone.superior_px}px and bottom ${K.SPEC_TECNICA.safe_zone.inferior_px}px of the frame).`,
    'No on-screen text, no logos, no watermarks, no burned-in subtitles.',
  ].join('\n');
}

/**
 * Refuerzos para el frame maestro (modelo de imagen).
 * Es el paso donde mas se rediseña el producto, porque un modelo de imagen tiene
 * mucha mas libertad creativa que uno de video encadenado.
 */
export function reforzarPromptFrame(promptFrame, { productoFijo, mapa } = {}) {
  return [
    promptFrame,
    bloqueFidelidad({ productoFijo, mapa }),
    'Vertical 9:16, phone photo, natural light, no retouching, authentic UGC look. Face visible, no on-screen text.',
  ].join('\n');
}