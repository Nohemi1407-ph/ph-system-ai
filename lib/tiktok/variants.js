/**
 * PH TikTok Shop Engine — MATRIZ DE VARIACIÓN
 * -----------------------------------------------------------------------------
 * Garantiza que las N variaciones de un mismo producto sean realmente distintas:
 * rota los ejes en vez de dejarlo al azar del modelo.
 *
 * Regla: dos variaciones del mismo lote NUNCA comparten familia de hook
 * ni ángulo de venta.
 */

import { getKnowledge } from './knowledgeStore.js';

/** PRNG determinístico (mulberry32) — misma semilla, mismo lote. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Toma el elemento i de una lista barajada, con vuelta al inicio. */
function pick(list, i, rand) {
  const s = shuffle(list, rand);
  return s[i % s.length];
}

/**
 * Construye el plan de variaciones.
 *
 * @param {Object} opts
 * @param {number} opts.n              Cantidad de variaciones (1-10)
 * @param {number} [opts.seed]         Semilla (para reproducir un lote)
 * @param {string[]} [opts.estrategias] Subconjunto de estrategias permitidas
 * @param {Object[]} [opts.ganadores]  Variaciones ganadoras previas (modo iteración)
 * @returns {Object[]} plan de variaciones
 */
export function construirPlanDeVariaciones({ n = 4, seed = Date.now(), estrategias, ganadores = [] } = {}) {
  const { FAMILIAS_HOOK, ESTRATEGIAS, EJES_VARIACION, CTA_NATURALES } = getKnowledge();
  const rand = rng(seed);
  const cantidad = Math.max(1, Math.min(10, n));

  const familias = shuffle(Object.keys(FAMILIAS_HOOK), rand);
  const estrategiasDisponibles = shuffle(
    (estrategias?.length ? estrategias : Object.keys(ESTRATEGIAS)).filter((e) => ESTRATEGIAS[e]),
    rand
  );
  const angulos = shuffle(EJES_VARIACION.angulo_venta, rand);

  // Modo iteración: la mitad del lote hereda el ADN de los ganadores.
  const heredadas = ganadores.length ? Math.ceil(cantidad / 2) : 0;

  return Array.from({ length: cantidad }, (_, i) => {
    const padre = heredadas && i < heredadas ? ganadores[i % ganadores.length] : null;

    return {
      id: `v${i + 1}`,
      semilla: seed + i,
      // Ejes que NUNCA se repiten dentro del lote:
      familia_hook: familias[i % familias.length],
      angulo_venta: angulos[i % angulos.length],
      // Ejes rotados:
      estrategia: padre?.estrategia || estrategiasDisponibles[i % estrategiasDisponibles.length],
      emocion: pick(EJES_VARIACION.emocion, i, rng(seed + i * 7)),
      escenario: pick(EJES_VARIACION.escenario, i, rng(seed + i * 13)),
      ritmo: pick(EJES_VARIACION.ritmo, i, rng(seed + i * 17)),
      tipo_historia: pick(EJES_VARIACION.tipo_historia, i, rng(seed + i * 23)),
      cta_sugerido: pick(CTA_NATURALES, i, rng(seed + i * 29)),
      // Herencia (sistema de testeo):
      inspirada_en: padre
        ? {
            id: padre.id,
            que_funciono: padre.que_funciono || 'estructura y ritmo del ganador',
            hook_original: padre.hook || null,
          }
        : null,
    };
  });
}

/**
 * Resumen legible del lote (para mostrar en la UI antes de gastar créditos).
 */
export function resumirPlan(plan) {
  const { FAMILIAS_HOOK, ESTRATEGIAS } = getKnowledge();
  return plan.map((v) => ({
    id: v.id,
    resumen: `${FAMILIAS_HOOK[v.familia_hook]?.nombre || v.familia_hook} · ${
      ESTRATEGIAS[v.estrategia]?.nombre || v.estrategia
    } · ${v.angulo_venta}`,
    hereda: v.inspirada_en?.id || null,
  }));
}
