/**
 * PH TikTok Shop Engine — CONOCIMIENTO VIVO
 * -----------------------------------------------------------------------------
 * La base (knowledge.js) es el piso. Encima se apilan las estructuras que el
 * cliente manda en PDF. El guionista siempre lee la versión mezclada.
 *
 * Lo que sube el cliente MANDA sobre lo que traíamos por defecto.
 */

import fs from 'fs';
import path from 'path';
import * as base from './knowledge.js';

const DIR = process.env.PH_DATA_DIR || path.join(process.cwd(), '.data');
const ARCHIVO = path.join(DIR, 'tiktok-knowledge.json');

let cache = null;

function leerOverlay() {
  if (cache) return cache;
  try {
    cache = fs.existsSync(ARCHIVO) ? JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) : { fuentes: [] };
  } catch {
    cache = { fuentes: [] };
  }
  return cache;
}

function guardarOverlay(overlay) {
  cache = overlay;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(overlay, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────

/** El conocimiento que realmente usa el guionista. */
export function getKnowledge() {
  const o = leerOverlay();

  const familias = { ...base.FAMILIAS_HOOK };
  for (const [id, f] of Object.entries(o.familias_hook || {})) {
    familias[id] = familias[id]
      ? {
          ...familias[id],
          ...f,
          // Las plantillas del cliente van primero y se suman a las nuestras.
          plantillas: [...(f.plantillas || []), ...(familias[id].plantillas || [])].slice(0, 12),
        }
      : f;
  }

  const estrategias = { ...base.ESTRATEGIAS, ...(o.estrategias || {}) };

  const ejes = { ...base.EJES_VARIACION };
  for (const [k, v] of Object.entries(o.ejes_variacion || {})) {
    if (Array.isArray(v) && v.length) ejes[k] = [...new Set([...v, ...(ejes[k] || [])])];
  }

  return {
    ESTRUCTURA_BASE: o.estructura_base?.length ? o.estructura_base : base.ESTRUCTURA_BASE,
    FAMILIAS_HOOK: familias,
    ESTRATEGIAS: estrategias,
    CTA_NATURALES: [...new Set([...(o.cta_naturales || []), ...base.CTA_NATURALES])],
    CTA_PROHIBIDOS: [...new Set([...(o.cta_prohibidos || []), ...base.CTA_PROHIBIDOS])],
    EJES_VARIACION: ejes,
    REGLAS_DURAS: [...new Set([...(o.reglas_duras || []), ...base.REGLAS_DURAS])],
    COMPLIANCE: {
      ...base.COMPLIANCE,
      frases_prohibidas: [
        ...new Set([...(o.compliance?.frases_prohibidas || []), ...base.COMPLIANCE.frases_prohibidas]),
      ],
      categorias_sensibles: { ...base.COMPLIANCE.categorias_sensibles, ...(o.compliance?.categorias_sensibles || {}) },
      reglas: [...new Set([...(o.compliance?.reglas || []), ...base.COMPLIANCE.reglas])],
    },
    SPEC_TECNICA: { ...base.SPEC_TECNICA, ...(o.spec_tecnica || {}) },
    NOTAS_DEL_CLIENTE: o.notas_del_cliente || [],
    beatsConTiempos: base.beatsConTiempos,
    fuentes: o.fuentes || [],
    version: `${base.KNOWLEDGE_VERSION}+${(o.fuentes || []).length}`,
  };
}

/**
 * Guarda lo extraído de un documento del cliente.
 * @param {Object} extraccion  JSON devuelto por el LLM al leer el PDF
 * @param {Object} meta        { nombre, tipo }
 */
export function aplicarExtraccion(extraccion = {}, meta = {}) {
  const o = leerOverlay();

  const fusionarLista = (a = [], b = []) => [...new Set([...a, ...b])];

  o.estructura_base = extraccion.estructura_base?.length ? extraccion.estructura_base : o.estructura_base;

  o.familias_hook = { ...(o.familias_hook || {}) };
  for (const [id, f] of Object.entries(extraccion.familias_hook || {})) {
    const previo = o.familias_hook[id] || {};
    o.familias_hook[id] = {
      ...previo,
      ...f,
      plantillas: fusionarLista(f.plantillas, previo.plantillas),
    };
  }

  o.estrategias = { ...(o.estrategias || {}), ...(extraccion.estrategias || {}) };

  o.ejes_variacion = { ...(o.ejes_variacion || {}) };
  for (const [k, v] of Object.entries(extraccion.ejes_variacion || {})) {
    if (Array.isArray(v)) o.ejes_variacion[k] = fusionarLista(v, o.ejes_variacion[k]);
  }

  o.cta_naturales = fusionarLista(extraccion.cta_naturales, o.cta_naturales);
  o.cta_prohibidos = fusionarLista(extraccion.cta_prohibidos, o.cta_prohibidos);
  o.reglas_duras = fusionarLista(extraccion.reglas_duras, o.reglas_duras);
  o.notas_del_cliente = fusionarLista(extraccion.notas_del_cliente, o.notas_del_cliente);

  o.compliance = {
    frases_prohibidas: fusionarLista(extraccion.compliance?.frases_prohibidas, o.compliance?.frases_prohibidas),
    categorias_sensibles: { ...(o.compliance?.categorias_sensibles || {}), ...(extraccion.compliance?.categorias_sensibles || {}) },
    reglas: fusionarLista(extraccion.compliance?.reglas, o.compliance?.reglas),
  };

  o.fuentes = [
    ...(o.fuentes || []),
    {
      nombre: meta.nombre || 'documento',
      tipo: meta.tipo || 'pdf',
      fecha: new Date().toISOString(),
      resumen: extraccion.resumen || null,
      elementos: {
        hooks: Object.keys(extraccion.familias_hook || {}).length,
        estrategias: Object.keys(extraccion.estrategias || {}).length,
        reglas: (extraccion.reglas_duras || []).length,
        ctas: (extraccion.cta_naturales || []).length,
      },
    },
  ];

  guardarOverlay(o);
  return resumenConocimiento();
}

/** Borra todo lo aprendido de PDFs y vuelve a la base. */
export function resetKnowledge() {
  guardarOverlay({ fuentes: [] });
  return resumenConocimiento();
}

/** Vista corta para la UI. */
export function resumenConocimiento() {
  const k = getKnowledge();
  return {
    version: k.version,
    fuentes: k.fuentes,
    conteo: {
      beats: k.ESTRUCTURA_BASE.length,
      familias_hook: Object.keys(k.FAMILIAS_HOOK).length,
      estrategias: Object.keys(k.ESTRATEGIAS).length,
      cta_naturales: k.CTA_NATURALES.length,
      reglas_duras: k.REGLAS_DURAS.length,
      frases_prohibidas: k.COMPLIANCE.frases_prohibidas.length,
    },
    familias: Object.entries(k.FAMILIAS_HOOK).map(([id, f]) => ({
      id,
      nombre: f.nombre,
      plantillas: (f.plantillas || []).length,
    })),
    notas_del_cliente: k.NOTAS_DEL_CLIENTE,
  };
}
