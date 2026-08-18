/**
 * INTERPRETACION DEL BRIEF
 * -----------------------------------------------------------------------------
 * Lo que escribe el vendedor no es un prompt tecnico: es un encargo en su
 * idioma, mezclando tres cosas distintas.
 *
 *   1. QUE DICE EL AVATAR — el guion hablado.
 *   2. QUE ES Y QUE NO ES EL PRODUCTO — "esto NO es una ampolla, solo vendemos
 *      el estuche". Esto es lo mas delicado: si el modelo no lo entiende,
 *      protagoniza el video el objeto equivocado y el anuncio no sirve.
 *   3. COMO SE RUEDA — "plano fijo", "en el baño", "que se vea la tapa".
 *
 * Antes todo eso iba en bruto al modelo de video, que no distingue una
 * aclaracion de producto de una linea de dialogo. Aqui se separa primero y se
 * le entrega ya ordenado.
 *
 * Si hay PDF del cliente cargado, la estructura de beats sale de ahi: es el
 * metodo del cliente, no uno inventado por nosotros.
 */

import { completarJSON } from '../tiktok/llm.js';
import { getKnowledge } from '../tiktok/knowledgeStore.js';

/** Estructura de video del cliente, si subio su PDF. */
function estructuraDelCliente() {
  try {
    const K = getKnowledge();
    const beats = K?.ESTRUCTURA_BASE || [];
    if (!beats.length) return null;
    return beats
      .map((b, i) => `${i + 1}. ${(b.nombre || b.beat || '').toUpperCase()} — ${b.objetivo || ''}`)
      .join('\n');
  } catch {
    return null;
  }
}

/**
 * Convierte el texto libre del vendedor en un encargo estructurado.
 *
 * Nunca inventa producto: si el texto no dice algo, se deja vacio. Inventar
 * aqui es peor que quedarse corto, porque acaba en pantalla.
 */
export async function interpretarBrief({ texto, identidadProducto = '', idioma = 'es', duracion = 8 }) {
  const estructura = estructuraDelCliente();
  const nombreIdioma = idioma === 'en' ? 'English' : idioma === 'pt' ? 'Portuguese' : 'Spanish';

  const sistema = `Eres el director de un anuncio corto para TikTok Shop. Recibes el encargo del vendedor en su idioma y lo conviertes en instrucciones para un modelo de video.

Tu trabajo NO es reescribir lo que pide: es ORDENARLO y separar lo que es dialogo de lo que son aclaraciones sobre el producto y de lo que son indicaciones de rodaje.

REGLA MAS IMPORTANTE — las aclaraciones en negativo mandan sobre todo lo demas.
Cuando el vendedor dice algo como "esto NO es una ampolla, solo vendemos el estuche", significa que el PROTAGONISTA del video es el estuche, y que las ampollas (si aparecen) son solo contenido, nunca el objeto que se ofrece. Confundir esto arruina el anuncio: se estaria vendiendo algo que no esta a la venta.

NUNCA inventes caracteristicas, marcas, precios ni beneficios que el vendedor no haya dicho. Si algo no se dice, se deja vacio.

Devuelves SOLO JSON.`;

  const usuario = `ENCARGO DEL VENDEDOR (su texto literal):
"""
${texto}
"""

${identidadProducto ? `IDENTIDAD VISUAL DEL PRODUCTO (leida de su foto, no la contradigas):\n${identidadProducto}\n` : ''}
${estructura ? `ESTRUCTURA DE VIDEO DEL CLIENTE (su metodo, respetala):\n${estructura}\n` : ''}
Duracion del video: ${duracion} segundos. El dialogo tiene que caber HABLADO en ese tiempo: maximo ${Math.round(duracion * 2.6)} palabras.

Devuelve SOLO este JSON:
{
  "dialogo": "lo que dice el avatar, en ${nombreIdioma}, literal y natural, como habla la gente en TikTok. Si el vendedor ya escribio el dialogo, respetalo casi tal cual.",
  "producto_es": "que ES exactamente lo que se vende, en ingles. Una frase.",
  "producto_no_es": ["cada cosa que el vendedor aclaro que NO es, o que NO se vende, en ingles"],
  "protagonista": "el objeto concreto que debe protagonizar el plano, en ingles",
  "accion_visual": "que ocurre en pantalla, en ingles, beat por beat y en una sola toma continua",
  "indicaciones_rodaje": ["cada indicacion de camara, escenario o encuadre que dio el vendedor, en ingles"],
  "tono": "el tono del avatar en una palabra o dos"
}`;

  try {
    const r = await completarJSON({ system: sistema, user: usuario, maxTokens: 1200 });
    return {
      dialogo: r.dialogo || '',
      producto_es: r.producto_es || '',
      producto_no_es: Array.isArray(r.producto_no_es) ? r.producto_no_es.filter(Boolean) : [],
      protagonista: r.protagonista || '',
      accion_visual: r.accion_visual || '',
      indicaciones_rodaje: Array.isArray(r.indicaciones_rodaje) ? r.indicaciones_rodaje.filter(Boolean) : [],
      tono: r.tono || '',
      interpretado: true,
      estructura_cliente: Boolean(estructura),
    };
  } catch (e) {
    // Sin motor de texto no se bloquea el anuncio: se manda el encargo tal
    // cual, que es lo que se hacia antes de existir esta capa.
    console.warn('[Marketing] No se pudo interpretar el brief:', e.message);
    return { dialogo: '', accion_visual: texto, producto_no_es: [], interpretado: false };
  }
}
