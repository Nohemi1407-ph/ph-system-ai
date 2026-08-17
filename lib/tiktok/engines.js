/**
 * PH TikTok Shop Engine — MOTORES DE GENERACION
 * -----------------------------------------------------------------------------
 * Un motor = proveedor + modelo de video (+ modelo de imagen si hace falta).
 * Solo modelos con AUDIO NATIVO: el avatar habla sin TTS ni lipsync aparte.
 *
 * Los costos son ESTIMADOS. El costo real que devuelve el proveedor
 * (creditsConsumed) se guarda en cada video generado.
 */

export const MOTORES = {
  // --- KIE.AI ---
  'kie-directo': {
    id: 'kie-directo',
    proveedor: 'kie',
    nombre: 'Kie · Directo',
    para: 'Avatar + producto van directo al video. Sin paso intermedio: mas rapido y mas barato.',
    frame: null,
    video: {
      modelo: 'veo3_fast',
      modo: 'REFERENCE_2_VIDEO',
      duraciones: [8],
      duracionDefault: 8,
    },
    costoEstimado: 0.4,
    recomendado: true,
  },
  'kie-frame': {
    id: 'kie-frame',
    proveedor: 'kie',
    nombre: 'Kie · Con frame',
    para: 'Arma primero la foto avatar+producto y despues la anima. Mas control del encuadre.',
    frame: { modelo: 'google/nano-banana-edit' },
    video: { modelo: 'veo3_fast', modo: null, duraciones: [8], duracionDefault: 8 },
    costoEstimado: 0.44,
  },
  'kie-calidad': {
    id: 'kie-calidad',
    proveedor: 'kie',
    nombre: 'Kie · Calidad',
    para: 'Para escalar un ganador. Veo 3.1 completo, maxima fidelidad y actuacion.',
    frame: { modelo: 'google/nano-banana-edit' },
    video: { modelo: 'veo3', modo: null, duraciones: [8], duracionDefault: 8 },
    costoEstimado: 1.6,
  },

  // --- MUAPI (respaldo, el repo ya venia conectado) ---
  'muapi-economico': {
    id: 'muapi-economico',
    proveedor: 'muapi',
    nombre: 'MuAPI · Economico',
    para: 'Respaldo. Sora 2, 10-15 s con audio.',
    frame: { modelo: 'nano-banana-edit' },
    video: {
      modelo: 'openai-sora-2-image-to-video',
      imageField: 'images_list',
      duraciones: [10, 15],
      duracionDefault: 10,
      extra: { remove_watermark: true },
    },
    costoEstimado: 0.3,
  },
  'muapi-recomendado': {
    id: 'muapi-recomendado',
    proveedor: 'muapi',
    nombre: 'MuAPI · Veo 3.1 Fast',
    para: 'Respaldo si Kie se cae. 8 s con dialogo.',
    frame: { modelo: 'nano-banana-edit' },
    video: {
      modelo: 'veo3.1-fast-image-to-video',
      imageField: 'image_url',
      duraciones: [8],
      duracionDefault: 8,
    },
    costoEstimado: 0.65,
  },
};

export const MOTOR_DEFAULT = process.env.PH_MOTOR_DEFAULT || 'kie-directo';

export function getMotor(id) {
  return MOTORES[id] || MOTORES[MOTOR_DEFAULT] || MOTORES['kie-directo'];
}

export function costoPorVideo(motorId) {
  return getMotor(motorId).costoEstimado;
}

export function costoLote(motorId, cantidad) {
  return Math.round(costoPorVideo(motorId) * cantidad * 100) / 100;
}

/** Motores disponibles segun que proveedores tengan llave configurada. */
export function listarMotores(proveedoresConfigurados = null) {
  return Object.values(MOTORES)
    .filter((m) => !proveedoresConfigurados || proveedoresConfigurados.includes(m.proveedor))
    .map((m) => ({
      id: m.id,
      proveedor: m.proveedor,
      nombre: m.nombre,
      para: m.para,
      duraciones: m.video.duraciones,
      duracionDefault: m.video.duracionDefault,
      costo: m.costoEstimado,
      referenciaDirecta: !m.frame,
      recomendado: Boolean(m.recomendado),
    }));
}
