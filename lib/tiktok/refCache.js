/**
 * PH TikTok Shop Engine — CACHE DE REFERENCIAS SUBIDAS
 * -----------------------------------------------------------------------------
 * El avatar y el producto se mandan a TODOS los shots del mismo video. Subirlos
 * una vez por shot es tiempo tirado (y a veces medio minuto por lote).
 *
 * Se cachea por hash del contenido, no por nombre: si el archivo es el mismo,
 * la URL del proveedor se reutiliza.
 *
 * TTL corto a proposito: las URLs de Kie caducan (24 h – 3 dias). Preferimos
 * volver a subir antes que entregar una URL muerta al modelo de video.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { getProveedor } from './providers/index.js';
import { ErrorVideo, CODIGOS } from './errors.js';

const DIR = process.env.PH_DATA_DIR || path.join(process.cwd(), '.data');
const ARCHIVO = path.join(DIR, 'tiktok-upload-cache.json');
const TTL_MS = 12 * 60 * 60 * 1000; // 12 h: la mitad del margen mas corto de Kie.

let memoria = null;

function leer() {
  if (memoria) return memoria;
  try {
    memoria = fs.existsSync(ARCHIVO) ? JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) : {};
  } catch {
    memoria = {};
  }
  return memoria;
}

function escribir(data) {
  memoria = data;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(ARCHIVO, JSON.stringify(data, null, 2));
  } catch {
    // Si el disco no deja escribir, la cache vive solo en memoria. No es critico.
  }
}

function hash(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

/**
 * Sube el buffer al proveedor, o devuelve la URL cacheada si ya se subio.
 * @returns {Promise<string>} URL en el proveedor
 */
export async function subirConCache(buffer, { apiKey, proveedor = 'kie', nombre = 'ref.png', tipo = 'image/png' } = {}) {
  const huella = hash(buffer);
  const clave = `${proveedor}:${huella}`;
  const data = leer();
  const guardado = data[clave];

  if (guardado && Date.now() - guardado.ts < TTL_MS) {
    return guardado.url;
  }

  try {
    const p = getProveedor(proveedor);
    // El nombre lleva la huella del contenido.
    //
    // Sin esto se perdian videos ya pagados: cada anuncio se subia como
    // "mkt-final.mp4", el proveedor guarda por nombre de archivo, y el
    // siguiente PISABA al anterior. Tres videos generados y cobrados
    // acababan compartiendo una sola URL. Con la huella, dos contenidos
    // distintos no pueden colisionar nunca, y el mismo contenido reutiliza
    // su URL como hasta ahora.
    const punto = nombre.lastIndexOf('.');
    const base = punto > 0 ? nombre.slice(0, punto) : nombre;
    const ext = punto > 0 ? nombre.slice(punto) : '';
    const nombreUnico = `${base}-${huella.slice(0, 10)}${ext}`;

    const url = await p.subirArchivo(new File([buffer], nombreUnico, { type: tipo }), apiKey);
    data[clave] = { url, ts: Date.now(), nombre: nombreUnico };
    escribir(data);
    return url;
  } catch (e) {
    throw new ErrorVideo(CODIGOS.UPLOAD_FAILED, `No se pudo subir ${nombre}: ${e.message}`);
  }
}

/** Limpia entradas caducadas. Se llama al arrancar un lote. */
export function limpiarCache() {
  const data = leer();
  const ahora = Date.now();
  let borradas = 0;
  for (const [k, v] of Object.entries(data)) {
    if (ahora - v.ts >= TTL_MS) {
      delete data[k];
      borradas++;
    }
  }
  if (borradas) escribir(data);
  return borradas;
}
