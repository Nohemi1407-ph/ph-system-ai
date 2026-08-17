/**
 * PH TikTok Shop Engine — SELECTOR DE PROVEEDOR
 * -----------------------------------------------------------------------------
 * Un solo punto donde se decide quién genera. Cambiar de motor de generación
 * es cambiar una variable de entorno, no reescribir el pipeline.
 */

import * as kie from './kie.js';
import * as muapi from './muapi.js';

const PROVEEDORES = { kie, muapi };

export const PROVEEDOR_DEFAULT = process.env.PH_PROVEEDOR || 'kie';

export function getProveedor(nombre) {
  return PROVEEDORES[nombre] || PROVEEDORES[PROVEEDOR_DEFAULT] || kie;
}

export function nombreProveedor(nombre) {
  return PROVEEDORES[nombre] ? nombre : PROVEEDOR_DEFAULT;
}

/** Llave del proveedor indicado, buscando en request → cookie → env. */
export function llaveDe(nombre, request) {
  return getProveedor(nombre).resolverLlave(request);
}

/** Qué proveedores están configurados ahora mismo. */
export function proveedoresDisponibles(request) {
  return Object.entries(PROVEEDORES).map(([id, p]) => ({
    id,
    configurado: Boolean(p.resolverLlave(request)),
    referenciaDirecta: p.capacidades.referenciaDirecta,
  }));
}
