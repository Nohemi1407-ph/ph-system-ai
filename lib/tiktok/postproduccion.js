/**
 * PH TikTok Shop Engine — POST-PRODUCCION
 * -----------------------------------------------------------------------------
 * Lo que hace falta DESPUES de que el video existe y que hasta ahora quedaba a
 * mano: la portada y el texto del post.
 *
 * El video largo salia sin caption ni hashtags (el modo lote si los tenia,
 * porque el guionista los escribia). Aqui se cierra ese hueco.
 */

import { completarJSON } from './llm.js';
import { extraerPortada } from './media.js';
import { subirConCache } from './refCache.js';

/**
 * Saca un frame del clip 1 y lo sube como portada.
 * Nunca lanza: quedarse sin portada no puede tumbar un video que ya se pago.
 */
export async function generarPortada({ videoUrl, apiKey, proveedor = 'kie' }) {
  try {
    const buffer = await extraerPortada(videoUrl);
    return await subirConCache(buffer, { apiKey, proveedor, nombre: 'ph-portada.png', tipo: 'image/png' });
  } catch (e) {
    console.warn('[PH TikTok] No se pudo generar la portada:', e.message);
    return null;
  }
}

/**
 * Caption + hashtags para el post, a partir del guion ya generado.
 * Mezcla de alcance como en el documento: unos pocos masivos, la mayoria medios
 * y de nicho, que es lo que realmente mueve el algoritmo de TikTok Shop.
 */
export async function generarCaption({ producto = {}, shots = [], idioma = 'es' }) {
  const dialogos = shots
    .map((s) => s?.subject?.dialogo)
    .filter(Boolean)
    .join(' ');

  if (!dialogos) return { caption: null, hashtags: [] };

  const nombreIdioma = idioma === 'en' ? 'English' : idioma === 'pt' ? 'português' : 'español';

  try {
    const r = await completarJSON({
      system:
        'Escribes el texto de publicaciones de TikTok Shop. Suenas a creador real, nunca a marca. Devuelves solo JSON.',
      user: `Producto: ${JSON.stringify(producto)}
Dialogo del video: "${dialogos}"

Devuelve SOLO este JSON:
{
  "caption": "texto del post en ${nombreIdioma}, entre 100 y 250 caracteres, sin sonar a anuncio, sin emojis de relleno",
  "hashtags": ["entre 12 y 20 hashtags: 2-3 masivos, el resto medios y de nicho del producto"]
}`,
      maxTokens: 600,
    });

    return {
      caption: r.caption || null,
      hashtags: Array.isArray(r.hashtags) ? r.hashtags.slice(0, 20) : [],
    };
  } catch (e) {
    console.warn('[PH TikTok] No se pudo generar el caption:', e.message);
    return { caption: null, hashtags: [] };
  }
}
