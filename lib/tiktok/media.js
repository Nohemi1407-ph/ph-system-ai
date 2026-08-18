/**
 * PH TikTok Shop Engine — UTILIDADES DE VIDEO (ffmpeg)
 * -----------------------------------------------------------------------------
 * Todo lo que toca archivos de video vive aqui: descargar, medir, sacar frames,
 * unir clips. Antes estaba enterrado dentro de longform.js y no se podia
 * reutilizar para la portada ni para el modo lote.
 *
 * Regla que ya aprendimos en produccion: ffmpeg/ffprobe fallan resolviendo
 * ciertos dominios remotos en Railway, pero el fetch de Node si los resuelve.
 * Por eso SIEMPRE se descarga el archivo antes de tocarlo con ffmpeg.
 */

import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ErrorVideo, CODIGOS } from './errors.js';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// ─── Cache de clips descargados ──────────────────────────────────────────────
// Cada clip se usa 3 veces: para sacar el frame de continuidad, para verificar
// la fidelidad y para la union final. Antes se descargaba entero las 3 veces.
// Aqui se descarga UNA vez por job y se reutiliza el archivo local.

const clipsLocales = new Map(); // url -> ruta local
let carpetaClips = null;

function dirClips() {
  if (!carpetaClips || !fs.existsSync(carpetaClips)) {
    carpetaClips = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-clips-'));
  }
  return carpetaClips;
}

/** Ruta local del clip, descargandolo solo si es la primera vez. */
export async function obtenerClipLocal(url) {
  const cacheado = clipsLocales.get(url);
  if (cacheado && fs.existsSync(cacheado)) return cacheado;

  const nombre = `${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}.mp4`;
  const destino = path.join(dirClips(), nombre);
  await descargarArchivo(url, destino);
  clipsLocales.set(url, destino);
  return destino;
}

/**
 * Se llama al terminar (o fallar) un job: los clips ya no hacen falta en disco.
 *
 * Borra SOLO los clips indicados, no la carpeta entera: si hay dos videos
 * generandose a la vez, uno terminando no puede llevarse por delante los
 * archivos del otro.
 */
export function limpiarClips(urls) {
  const objetivo = urls?.length ? urls : [...clipsLocales.keys()];

  for (const url of objetivo) {
    const ruta = clipsLocales.get(url);
    if (ruta) {
      fs.rmSync(ruta, { force: true });
      clipsLocales.delete(url);
    }
  }

  // Cuando ya no queda ningun clip de ningun job, se tira la carpeta.
  if (clipsLocales.size === 0 && carpetaClips) {
    fs.rmSync(carpetaClips, { recursive: true, force: true });
    carpetaClips = null;
  }
}

export async function descargarArchivo(url, destino) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new ErrorVideo(CODIGOS.DOWNLOAD_FAILED, `No se pudo descargar ${url}: ${e.message}`);
  }
  if (!res.ok) {
    throw new ErrorVideo(CODIGOS.DOWNLOAD_FAILED, `No se pudo descargar ${url}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destino, buffer);
  return buffer;
}

export async function obtenerDuracionSegundos(rutaVideo) {
  return await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(rutaVideo, (err, data) => {
      if (err) return reject(err);
      const duracion = data?.format?.duration;
      if (!duracion) return reject(new Error('No se pudo leer la duracion del video.'));
      resolve(duracion);
    });
  });
}

function segundoDe(momento, duracion) {
  if (momento === 'ultimo') return Math.max(0, duracion - 0.15);
  if (momento === 'medio') return duracion / 2;
  return Math.min(Math.max(0, Number(momento) || 0), Math.max(0, duracion - 0.05));
}

/**
 * Saca VARIOS frames del mismo clip con una sola descarga y un solo ffprobe.
 *
 * El video largo necesita dos frames por clip: el ultimo (para encadenar el
 * siguiente) y el del medio (para verificar el producto). Antes cada uno
 * descargaba el MP4 entero por su cuenta.
 *
 * @param {string} videoUrl
 * @param {Array<number|'ultimo'|'medio'>} momentos
 * @returns {Promise<Buffer[]>} un buffer PNG por momento, en el mismo orden
 */
export async function extraerFrames(videoUrl, momentos = ['ultimo']) {
  const videoLocal = await obtenerClipLocal(videoUrl);
  const duracion = await obtenerDuracionSegundos(videoLocal);
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-frame-'));

  try {
    const buffers = [];

    for (let i = 0; i < momentos.length; i++) {
      const framePath = path.join(carpeta, `frame${i}.png`);

      // seekInput + frames(1) en vez de screenshots(): con timestamps en
      // porcentaje el helper a veces no escribe el archivo esperado.
      await new Promise((resolve, reject) => {
        ffmpeg(videoLocal)
          .seekInput(segundoDe(momentos[i], duracion))
          .frames(1)
          .output(framePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      if (!fs.existsSync(framePath)) {
        throw new Error(`No se genero el archivo de frame esperado en ${framePath}`);
      }
      buffers.push(fs.readFileSync(framePath));
    }

    return buffers;
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/** Un solo frame. Atajo sobre extraerFrames. */
export async function extraerFrame(videoUrl, momento = 'ultimo') {
  const [buffer] = await extraerFrames(videoUrl, [momento]);
  return buffer;
}

/** Atajo con el nombre viejo, para no romper llamadas existentes. */
export function extraerUltimoFrame(videoUrl) {
  return extraerFrame(videoUrl, 'ultimo');
}

/** Frame representativo para portada: 1s dentro del clip, no el primer fotograma negro. */
export function extraerPortada(videoUrl) {
  return extraerFrame(videoUrl, 1);
}

/**
 * Une los clips en un solo MP4.
 *
 * Camino rapido: demuxer `concat` con `-c copy`. No recodifica nada, solo pega
 * los streams — cuestion de segundos en vez de minutos. Funciona porque todos
 * los clips salen del mismo modelo con el mismo codec, resolucion y fps.
 *
 * Si por lo que sea no encajan, se cae al re-encode de siempre.
 */
/** Ratio "16:9" -> 16/9. Devuelve null si no se entiende. */
export function leerRatio(texto) {
  const m = /^(\d+)\s*:\s*(\d+)$/.exec(String(texto || '').trim());
  if (!m) return null;
  const [w, h] = [Number(m[1]), Number(m[2])];
  return w > 0 && h > 0 ? w / h : null;
}

/**
 * Deja el video en la duracion y el encuadre pedidos, en UNA sola pasada.
 *
 * Hace falta porque el modelo no da cualquier duracion ni cualquier ratio: da
 * clips de 8s en 9:16 o 16:9. Si el usuario pide 5s en 4:3, se genera lo mas
 * parecido y aqui se ajusta — recortando por el centro, nunca deformando.
 *
 * @param {string} entrada  ruta local o URL del video
 * @param {{segundos?: number, ratio?: string}} opts
 * @returns {Promise<Buffer>} el MP4 resultante
 */
export async function ajustarVideo(entrada, { segundos, ratio } = {}) {
  const local = entrada.startsWith('http') ? await obtenerClipLocal(entrada) : entrada;
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-ajuste-'));
  const salida = path.join(carpeta, 'ajustado.mp4');

  try {
    const objetivo = leerRatio(ratio);
    const duracionReal = await obtenerDuracionSegundos(local);
    const recorta = segundos && segundos < duracionReal - 0.05;

    if (!objetivo && !recorta) return fs.readFileSync(local);

    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(local);

      if (recorta) cmd.duration(segundos);

      if (objetivo) {
        // Recorte centrado al ratio pedido. Se toma el lado que sobra:
        // nunca se estira la imagen, que es lo que delata un video mal hecho.
        cmd.videoFilters(
          `crop='if(gt(a,${objetivo}),ih*${objetivo},iw)':'if(gt(a,${objetivo}),ih,iw/${objetivo})'`
        );
        cmd.outputOptions(['-c:a copy']);
      } else {
        cmd.outputOptions(['-c copy']);
      }

      cmd
        .outputOptions(['-movflags +faststart'])
        .output(salida)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    if (!fs.existsSync(salida) || fs.statSync(salida).size === 0) {
      throw new Error('El ajuste produjo un archivo vacio.');
    }
    return fs.readFileSync(salida);
  } catch (e) {
    throw new ErrorVideo(CODIGOS.STITCH_FAILED, `No se pudo ajustar el video: ${e.message}`);
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

export async function unirClips(urls) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-unir-'));
  try {
    // Ya estan en disco de cuando se saco su frame: no se vuelven a bajar.
    const rutas = [];
    for (const url of urls) rutas.push(await obtenerClipLocal(url));

    const salida = path.join(carpeta, 'final.mp4');
    const lista = path.join(carpeta, 'clips.txt');
    fs.writeFileSync(lista, rutas.map((r) => `file '${r.replace(/'/g, "'\\''")}'`).join('\n'));

    try {
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(lista)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions(['-c copy', '-movflags +faststart'])
          .output(salida)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    } catch (e) {
      console.warn('[PH TikTok] Concat sin recodificar fallo, recodificando:', e.message);
      await new Promise((resolve, reject) => {
        const cmd = ffmpeg();
        rutas.forEach((r) => cmd.input(r));
        cmd.on('end', resolve).on('error', reject).mergeToFile(salida, carpeta);
      });
    }

    if (!fs.existsSync(salida) || fs.statSync(salida).size === 0) {
      throw new Error('La union produjo un archivo vacio.');
    }
    return fs.readFileSync(salida);
  } catch (e) {
    throw new ErrorVideo(CODIGOS.STITCH_FAILED, `No se pudieron unir los clips: ${e.message}`, { clips: urls });
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}
