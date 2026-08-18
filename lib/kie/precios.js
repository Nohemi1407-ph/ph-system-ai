/**
 * PRECIOS REALES DE KIE
 * -----------------------------------------------------------------------------
 * Esto existe porque una estimacion inventada costo dinero de verdad.
 *
 * Yo daba por hecho que un video costaba ~40 creditos fijos. Los modelos de
 * video de Kie se cobran POR SEGUNDO y por resolucion: un anuncio de 5 s a
 * 1080p con Seedance 2.5 son hasta 570 creditos. Con 580 de saldo, el
 * pre-vuelo decia "adelante", Kie respondia "Credits insufficient", y el
 * respaldo —que si cobra— se llevaba 60 creditos sin entregar video.
 *
 * Tarifas tomadas de las fichas publicas de cada modelo en kie.ai.
 * "conVideo" es la tarifa cuando se pasa video de referencia; sale mas barata
 * que sin el. Se asume SIEMPRE la mas cara, porque un pre-vuelo que se queda
 * corto es peor que uno que sobra.
 */

/** creditos por segundo, por resolucion. null = esa resolucion no existe. */
export const TARIFAS = {
  // Verificado en kie.ai/seedance-2-5
  'bytedance/seedance-2-5': {
    '480p': { conVideo: 17, sinVideo: 28 },
    '720p': { conVideo: 38, sinVideo: 63 },
    '1080p': { conVideo: 68.5, sinVideo: 114 },
  },
  // Verificado en kie.ai/seedance-2-0
  'bytedance/seedance-2': {
    '480p': { conVideo: 6.8, sinVideo: 11.7 },
    '720p': { conVideo: 15, sinVideo: 24.8 },
  },
  // Las variantes ligeras de la 2.0 no publican tarifa propia. Se les aplica la
  // de la 2.0, que es su techo: son mas baratas, nunca mas caras. Sobreestimar
  // aqui solo hace que el pre-vuelo sea mas prudente.
  'bytedance/seedance-2-fast': {
    '480p': { conVideo: 6.8, sinVideo: 11.7 },
    '720p': { conVideo: 15, sinVideo: 24.8 },
  },
  'bytedance/seedance-2-mini': {
    '480p': { conVideo: 6.8, sinVideo: 11.7 },
    '720p': { conVideo: 15, sinVideo: 24.8 },
  },
};

/** Modelos con precio fijo por clip, no por segundo. */
export const PRECIO_POR_CLIP = {
  veo3_fast: 40, // ~$0.40 por clip de 8 s
  veo3_lite: 20,
  veo3: 160,
  'google/nano-banana': 5,
  'google/nano-banana-edit': 5,
};

export const CREDITOS_POR_USD = 100;

/**
 * Coste en creditos de una generacion.
 *
 * @param {string} modelo      id de Kie
 * @param {Object} opts
 * @param {number} [opts.duracion]   segundos (modelos por segundo)
 * @param {string} [opts.resolucion]
 * @param {boolean} [opts.conVideoRef]
 * @returns {{creditos: number, usd: number, exacto: boolean}}
 */
export function costoEnCreditos(modelo, { duracion = 5, resolucion = '720p', conVideoRef = false } = {}) {
  const tarifa = TARIFAS[modelo];

  if (tarifa) {
    // Si piden una resolucion que el modelo no tiene, se cobra por la mayor
    // que ofrece: es lo que acabara generando.
    const banda = tarifa[resolucion] || tarifa[Object.keys(tarifa).pop()];
    const porSegundo = conVideoRef ? banda.conVideo : banda.sinVideo;
    const creditos = Math.ceil(porSegundo * Math.max(1, duracion));
    return { creditos, usd: Math.round((creditos / CREDITOS_POR_USD) * 100) / 100, exacto: true };
  }

  const fijo = PRECIO_POR_CLIP[modelo];
  if (fijo) {
    const clips = Math.max(1, Math.ceil(duracion / 8));
    const creditos = fijo * clips;
    return { creditos, usd: Math.round((creditos / CREDITOS_POR_USD) * 100) / 100, exacto: true };
  }

  // Sin tarifa conocida: se estima alto y se marca como no exacto, para que
  // quien lo muestre pueda decir que es aproximado.
  return { creditos: 100, usd: 1, exacto: false };
}

/** Resoluciones que soporta el modelo, segun su tarifa. */
export function resolucionesDe(modelo) {
  return TARIFAS[modelo] ? Object.keys(TARIFAS[modelo]) : null;
}
