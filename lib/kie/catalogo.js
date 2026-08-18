/**
 * CATALOGO DE MODELOS DE KIE
 * -----------------------------------------------------------------------------
 * Todo el software genera a traves de Kie. Este archivo es la unica fuente de
 * verdad sobre QUE modelos hay y QUE espera cada uno.
 *
 * Es un catalogo de DATOS a proposito: añadir un modelo de Kie es añadir una
 * fila aqui, sin tocar el motor ni la interfaz.
 *
 * Cada entrada declara:
 *   id        identificador que usa la interfaz
 *   modelo    el id EXACTO que espera Kie en el campo "model"
 *   tarea     t2i | i2i | t2v | i2v | v2v | lipsync
 *   endpoint  'market' (jobs/createTask) o 'veo' (endpoint dedicado de Veo)
 *   inputs    esquema para que la interfaz pinte sus opciones (misma forma que
 *             el catalogo anterior, para no reescribir los studios)
 *   construir(p) traduce los parametros de la interfaz al input de Kie
 *
 * OJO: el id del modelo NO siempre coincide con la ruta de su documentacion
 * (por ejemplo kling/image-to-video se envia como kling-2.6/image-to-video).
 * Cada id de aqui esta comprobado contra su pagina de docs.
 */

const RATIOS_IMAGEN = ['1:1', '3:4', '4:3', '9:16', '16:9', '3:2', '2:3', '5:4', '4:5', '21:9'];

const campoPrompt = (descripcion) => ({
  name: 'prompt',
  title: 'Prompt',
  type: 'string',
  description: descripcion,
});

const campoRatio = (valores = RATIOS_IMAGEN, def = '1:1') => ({
  name: 'aspect_ratio',
  title: 'Aspect Ratio',
  type: 'string',
  enum: valores,
  default: def,
});

const campoDuracion = (valores, def) => ({
  name: 'duration',
  title: 'Duration',
  type: 'string',
  enum: valores,
  default: def,
});

const campoResolucion = (valores, def) => ({
  name: 'resolution',
  title: 'Resolution',
  type: 'string',
  enum: valores,
  default: def,
});

export const MODELOS = [
  // ─── Texto → imagen ────────────────────────────────────────────────────────
  {
    id: 'nano-banana',
    modelo: 'google/nano-banana',
    name: 'Nano Banana (Google)',
    tarea: 't2i',
    endpoint: 'market',
    inputs: {
      prompt: campoPrompt('Describe la imagen que quieres.'),
      aspect_ratio: campoRatio(),
    },
    construir: (p) => ({
      prompt: p.prompt,
      aspect_ratio: p.aspect_ratio || '1:1',
      output_format: 'png',
    }),
  },

  // ─── Imagen → imagen (edicion) ─────────────────────────────────────────────
  {
    id: 'nano-banana-edit',
    modelo: 'google/nano-banana-edit',
    name: 'Nano Banana Edit (Google)',
    tarea: 'i2i',
    endpoint: 'market',
    maxImagenes: 10,
    inputs: {
      prompt: campoPrompt('Describe el cambio que quieres sobre la imagen.'),
      aspect_ratio: campoRatio([...RATIOS_IMAGEN, 'auto'], 'auto'),
    },
    construir: (p) => ({
      prompt: p.prompt,
      image_urls: (p.image_urls || [p.image_url]).filter(Boolean).slice(0, 10),
      aspect_ratio: p.aspect_ratio || 'auto',
      output_format: 'png',
    }),
  },

  // ─── Texto → video ─────────────────────────────────────────────────────────
  {
    id: 'veo3-fast',
    modelo: 'veo3_fast',
    name: 'Veo 3.1 Fast (Google)',
    tarea: 't2v',
    endpoint: 'veo',
    inputs: {
      prompt: campoPrompt('Describe el video, con dialogo entre comillas si lo hay.'),
      aspect_ratio: campoRatio(['9:16', '16:9'], '9:16'),
    },
    construir: (p) => ({ prompt: p.prompt, aspect_ratio: p.aspect_ratio || '9:16' }),
  },
  {
    id: 'veo3',
    modelo: 'veo3',
    name: 'Veo 3.1 Calidad (Google)',
    tarea: 't2v',
    endpoint: 'veo',
    inputs: {
      prompt: campoPrompt('Describe el video, con dialogo entre comillas si lo hay.'),
      aspect_ratio: campoRatio(['9:16', '16:9'], '9:16'),
    },
    construir: (p) => ({ prompt: p.prompt, aspect_ratio: p.aspect_ratio || '9:16' }),
  },

  // ─── Imagen → video ────────────────────────────────────────────────────────
  {
    id: 'veo3-fast-i2v',
    modelo: 'veo3_fast',
    name: 'Veo 3.1 Fast — desde imagen',
    tarea: 'i2v',
    endpoint: 'veo',
    modo: 'REFERENCE_2_VIDEO',
    maxImagenes: 3,
    inputs: {
      prompt: campoPrompt('Que ocurre en el video, partiendo de la imagen.'),
      aspect_ratio: campoRatio(['9:16', '16:9'], '9:16'),
    },
    construir: (p) => ({
      prompt: p.prompt,
      aspect_ratio: p.aspect_ratio || '9:16',
      imagenes: (p.image_urls || [p.image_url]).filter(Boolean),
    }),
  },
  {
    id: 'seedance-pro-i2v',
    modelo: 'bytedance/v1-pro-image-to-video',
    name: 'Seedance 1 Pro — desde imagen (ByteDance)',
    tarea: 'i2v',
    endpoint: 'market',
    inputs: {
      prompt: campoPrompt('Que ocurre en el video, partiendo de la imagen.'),
      duration: campoDuracion(['5', '10'], '5'),
      resolution: campoResolucion(['480p', '720p', '1080p'], '1080p'),
    },
    construir: (p) => ({
      prompt: p.prompt,
      image_url: p.image_url || (p.image_urls || [])[0],
      duration: String(p.duration || 5),
      resolution: p.resolution || '1080p',
    }),
  },

  {
    id: 'seedance-2-5',
    modelo: 'bytedance/seedance-2-5',
    name: 'Seedance 2.5 · ByteDance',
    tarea: 'i2v',
    endpoint: 'market',
    maxImagenes: 30,
    inputs: {
      prompt: campoPrompt('Describe el video.'),
      aspect_ratio: campoRatio(['adaptive', '1:1', '4:3', '3:4', '16:9', '9:16', '21:9'], 'adaptive'),
      resolution: campoResolucion(['480p', '720p', '1080p'], '1080p'),
      duration: {
        name: 'duration',
        title: 'Duration',
        type: 'number',
        // Nativo de 4 a 30 s: no hace falta encadenar clips ni recortar.
        enum: Array.from({ length: 27 }, (_, i) => i + 4),
        default: 5,
      },
    },
    construir: (p) => ({
      prompt: p.prompt,
      reference_image_urls: (p.image_urls || [p.image_url]).filter(Boolean).slice(0, 30),
      ...(p.video_urls?.length ? { reference_video_urls: p.video_urls.slice(0, 10) } : {}),
      duration: Math.max(4, Math.min(30, Number(p.duration) || 5)),
      resolution: p.resolution || '1080p',
      aspect_ratio: p.aspect_ratio || 'adaptive',
      generate_audio: p.generate_audio !== false,
      output_format: 'mp4',
    }),
  },

  // ─── Video → video ─────────────────────────────────────────────────────────
  {
    id: 'wan-v2v',
    modelo: 'wan/2-6-video-to-video',
    name: 'Wan 2.6 — video a video (Alibaba)',
    tarea: 'v2v',
    endpoint: 'market',
    inputs: {
      prompt: campoPrompt('Describe la transformacion que quieres sobre el video.'),
      duration: campoDuracion(['5', '10'], '5'),
      resolution: campoResolucion(['720p', '1080p'], '1080p'),
    },
    construir: (p) => ({
      prompt: p.prompt,
      video_urls: [p.video_url].filter(Boolean).slice(0, 3),
      duration: String(p.duration || 5),
      resolution: p.resolution || '1080p',
    }),
  },

  // ─── Lip sync ──────────────────────────────────────────────────────────────
  {
    id: 'lipsync-volcengine',
    modelo: 'volcengine/video-to-video-lip-sync',
    name: 'Lip Sync sobre video (Volcengine)',
    tarea: 'lipsync',
    endpoint: 'market',
    categoria: 'video',
    inputs: {
      mode: { name: 'mode', title: 'Modo', type: 'string', enum: ['lite', 'basic'], default: 'basic' },
    },
    construir: (p) => ({
      mode: p.mode || 'basic',
      video_url: p.video_url,
      audio_url: p.audio_url,
      align_audio: true,
    }),
  },
];

export function porTarea(tarea) {
  return MODELOS.filter((m) => m.tarea === tarea);
}

export function porId(id) {
  return MODELOS.find((m) => m.id === id) || null;
}

/** Forma que espera la interfaz de los studios (id, name, endpoint, inputs). */
export function paraInterfaz(tarea) {
  return porTarea(tarea).map(({ id, name, inputs, modelo, categoria, maxImagenes }) => ({
    id,
    name,
    endpoint: modelo,
    inputs,
    ...(categoria ? { category: categoria } : {}),
    ...(maxImagenes ? { maxImages: maxImagenes } : {}),
  }));
}
