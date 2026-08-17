/**
 * PH TikTok Shop Engine — PROVEEDOR MUAPI
 * -----------------------------------------------------------------------------
 * Adapta el cliente MuAPI existente a la misma interfaz que Kie, para poder
 * cambiar de proveedor sin tocar el pipeline.
 */

import * as mu from '../muapi.js';

export const capacidades = {
  referenciaDirecta: false, // MuAPI necesita el frame maestro primero
  reportaCreditos: true,
};

export const resolverLlave = mu.resolverLlave;
export const subirArchivo = mu.subirArchivo;
export const saldo = mu.saldo;

export async function generarFrame({ modelo, prompt, imagenes, aspect_ratio = '9:16' }, apiKey, opts) {
  const r = await mu.generarFrame({ endpoint: modelo, prompt, imagenes, aspect_ratio }, apiKey, opts);
  return { ...r, creditos: null };
}

export async function generarVideo({ modelo, prompt, imagenes = [], duracion, aspect_ratio = '9:16', imageField, extra }, apiKey, opts) {
  const r = await mu.generarVideo(
    {
      endpoint: modelo,
      prompt,
      image_url: imagenes[0],
      duration: duracion,
      aspect_ratio,
      imageField,
      extra,
    },
    apiKey,
    opts
  );
  return { ...r, creditos: null };
}
