/**
 * CATALOGO DE MODELOS PARA LA INTERFAZ (KIE)
 * -----------------------------------------------------------------------------
 * Sustituye a models.js, que describia el catalogo de MuAPI.
 *
 * Exporta EXACTAMENTE los mismos nombres que usaban los studios, para que la
 * interfaz siga funcionando sin reescribirla: cambia lo que se ofrece, no como
 * se pinta.
 *
 * ⚠️ Los `id` de aqui tienen que coincidir con los de lib/kie/catalogo.js, que
 * es quien sabe traducirlos al modelo real de Kie. Si no coinciden, el servidor
 * responde "Modelo desconocido" — falla a la vista, no en silencio.
 */

const RATIOS_IMAGEN = ['1:1', '3:4', '4:3', '9:16', '16:9', '3:2', '2:3', '5:4', '4:5', '21:9'];
const RATIOS_VIDEO = ['9:16', '16:9'];

// ─── Texto → imagen ──────────────────────────────────────────────────────────

export const t2iModels = [
  {
    id: 'nano-banana',
    name: 'Nano Banana · Google',
    endpoint: 'google/nano-banana',
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe la imagen que quieres.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: RATIOS_IMAGEN, default: '1:1' },
    },
  },
];

// ─── Imagen → imagen ─────────────────────────────────────────────────────────

export const i2iModels = [
  {
    id: 'nano-banana-edit',
    name: 'Nano Banana Edit · Google',
    endpoint: 'google/nano-banana-edit',
    maxImages: 10,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el cambio sobre la imagen.' },
      aspect_ratio: {
        name: 'aspect_ratio',
        title: 'Aspect Ratio',
        type: 'string',
        enum: ['auto', ...RATIOS_IMAGEN],
        default: 'auto',
      },
    },
  },
];

// ─── Texto → video ───────────────────────────────────────────────────────────

export const t2vModels = [
  {
    id: 'veo3-fast',
    name: 'Veo 3.1 Fast · Google',
    endpoint: 'veo3_fast',
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el video. El diálogo va entre comillas.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: RATIOS_VIDEO, default: '9:16' },
    },
  },
  {
    id: 'veo3',
    name: 'Veo 3.1 Calidad · Google',
    endpoint: 'veo3',
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el video. El diálogo va entre comillas.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: RATIOS_VIDEO, default: '9:16' },
    },
  },
];

// ─── Imagen → video ──────────────────────────────────────────────────────────

export const i2vModels = [
  {
    id: 'seedance-2-mini',
    name: 'Seedance 2.0 Mini · el más barato',
    endpoint: 'bytedance/seedance-2-mini',
    maxImages: 9,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el video.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: ['adaptive','1:1','4:3','3:4','16:9','9:16','21:9'], default: 'adaptive' },
      resolution: { name: 'resolution', title: 'Resolution', type: 'string', enum: ['480p','720p'], default: '480p' },
      duration: { name: 'duration', title: 'Duration', type: 'number', enum: Array.from({length:12},(_,i)=>i+4), default: 5 },
    },
  },
  {
    id: 'seedance-2-fast',
    name: 'Seedance 2.0 Fast · barato',
    endpoint: 'bytedance/seedance-2-fast',
    maxImages: 9,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el video.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: ['adaptive','1:1','4:3','3:4','16:9','9:16','21:9'], default: 'adaptive' },
      resolution: { name: 'resolution', title: 'Resolution', type: 'string', enum: ['480p','720p'], default: '720p' },
      duration: { name: 'duration', title: 'Duration', type: 'number', enum: Array.from({length:12},(_,i)=>i+4), default: 5 },
    },
  },
  {
    id: 'seedance-2-5',
    name: 'Seedance 2.5 · el mejor (y el más caro)',
    endpoint: 'bytedance/seedance-2-5',
    maxImages: 30,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe el video.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: ['adaptive','1:1','4:3','3:4','16:9','9:16','21:9'], default: 'adaptive' },
      resolution: { name: 'resolution', title: 'Resolution', type: 'string', enum: ['480p','720p','1080p'], default: '720p' },
      duration: { name: 'duration', title: 'Duration', type: 'number', enum: Array.from({length:27},(_,i)=>i+4), default: 5 },
    },
  },
  {
    id: 'veo3-fast-i2v',
    name: 'Veo 3.1 Fast · desde imagen',
    endpoint: 'veo3_fast',
    maxImages: 3,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Qué ocurre en el video.' },
      aspect_ratio: { name: 'aspect_ratio', title: 'Aspect Ratio', type: 'string', enum: RATIOS_VIDEO, default: '9:16' },
    },
  },
  {
    id: 'seedance-pro-i2v',
    name: 'Seedance 1 Pro · ByteDance',
    endpoint: 'bytedance/v1-pro-image-to-video',
    maxImages: 1,
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Qué ocurre en el video.' },
      duration: { name: 'duration', title: 'Duration', type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { name: 'resolution', title: 'Resolution', type: 'string', enum: ['480p', '720p', '1080p'], default: '1080p' },
    },
  },
];

// ─── Video → video ───────────────────────────────────────────────────────────

export const v2vModels = [
  {
    id: 'wan-v2v',
    name: 'Wan 2.6 · video a video',
    endpoint: 'wan/2-6-video-to-video',
    hasPrompt: true,
    videoField: 'video_url',
    inputs: {
      prompt: { name: 'prompt', title: 'Prompt', type: 'string', description: 'Describe la transformación.' },
      duration: { name: 'duration', title: 'Duration', type: 'string', enum: ['5', '10'], default: '5' },
      resolution: { name: 'resolution', title: 'Resolution', type: 'string', enum: ['720p', '1080p'], default: '1080p' },
    },
  },
];

// ─── Lip sync ────────────────────────────────────────────────────────────────

export const lipsyncModels = [
  {
    id: 'lipsync-volcengine',
    name: 'Lip Sync sobre video · Volcengine',
    endpoint: 'volcengine/video-to-video-lip-sync',
    category: 'video',
    inputs: {
      mode: { name: 'mode', title: 'Modo', type: 'string', enum: ['basic', 'lite'], default: 'basic' },
    },
  },
];

export const imageLipSyncModels = lipsyncModels.filter((m) => m.category === 'image');
export const videoLipSyncModels = lipsyncModels.filter((m) => m.category === 'video');

// ─── Helpers: misma firma que los del catalogo anterior ──────────────────────

const buscar = (lista) => (id) => lista.find((m) => m.id === id) || null;
const enumDe = (lista, campo) => (id) => buscar(lista)(id)?.inputs?.[campo]?.enum || [];

export const getModelById = buscar(t2iModels);
export const getI2IModelById = buscar(i2iModels);
export const getVideoModelById = buscar(t2vModels);
export const getI2VModelById = buscar(i2vModels);
export const getV2VModelById = buscar(v2vModels);
export const getLipSyncModelById = buscar(lipsyncModels);

export const getAspectRatiosForModel = enumDe(t2iModels, 'aspect_ratio');
export const getAspectRatiosForI2IModel = enumDe(i2iModels, 'aspect_ratio');
export const getAspectRatiosForVideoModel = enumDe(t2vModels, 'aspect_ratio');
export const getAspectRatiosForI2VModel = enumDe(i2vModels, 'aspect_ratio');

export const getResolutionsForModel = enumDe(t2iModels, 'resolution');
export const getResolutionsForI2IModel = enumDe(i2iModels, 'resolution');
export const getResolutionsForVideoModel = enumDe(t2vModels, 'resolution');
export const getResolutionsForI2VModel = enumDe(i2vModels, 'resolution');
export const getResolutionsForLipSyncModel = enumDe(lipsyncModels, 'resolution');

export const getDurationsForModel = enumDe(t2vModels, 'duration');
export const getDurationsForI2VModel = enumDe(i2vModels, 'duration');

// Estos existian para modelos de MuAPI con campos propios (efectos, modos,
// campo de calidad). Ningun modelo de Kie del catalogo los usa todavia, asi que
// devuelven vacio en vez de inventar opciones que no existen.
export const getQualityFieldForModel = () => null;
export const getQualityFieldForI2IModel = () => null;
export const getEffectsForI2IModel = () => [];
export const getDefaultEffectForI2IModel = () => null;
export const getEffectsForI2VModel = () => [];
export const getDefaultEffectForI2VModel = () => null;
export const getModesForModel = (id) => enumDe(lipsyncModels, 'mode')(id);
export const getMaxImagesForI2IModel = (id) => buscar(i2iModels)(id)?.maxImages || 1;
