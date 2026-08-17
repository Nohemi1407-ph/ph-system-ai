/**
 * PH TikTok Shop Engine — CONTROL DE SALDO (pre-vuelo)
 * -----------------------------------------------------------------------------
 * Generar video es lo caro del sistema. El problema real no es gastar: es gastar
 * A MEDIAS — que 3 de 5 clips salgan y el lote muera sin saldo, dejando un video
 * inservible y los creditos ya cobrados.
 *
 * Por eso el saldo se revisa ANTES de disparar nada, y el costo real que devuelve
 * el proveedor se acumula clip a clip.
 *
 * Convencion de unidades (la que ya usaba el proyecto):
 *   creditos del proveedor / 100 = costo en USD.
 * El saldo se reporta SIEMPRE en creditos, que es lo unico que devuelve la API.
 * Nunca se inventa una conversion distinta.
 */

import { getProveedor } from './providers/index.js';
import { ErrorVideo, CODIGOS } from './errors.js';

export const CREDITOS_POR_USD = 100;

export function usdACreditos(usd) {
  return Math.ceil((Number(usd) || 0) * CREDITOS_POR_USD);
}

/** Normaliza el saldo, venga como venga del proveedor. */
function leerNumero(bruto) {
  if (bruto == null) return null;
  if (typeof bruto === 'number') return bruto;
  if (typeof bruto === 'string') {
    const n = Number(bruto);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof bruto === 'object') {
    for (const clave of ['creditos', 'credits', 'balance', 'credit', 'amount', 'remaining']) {
      const v = leerNumero(bruto[clave]);
      if (v != null) return v;
    }
    if (bruto.data) return leerNumero(bruto.data);
  }
  return null;
}

/**
 * Saldo actual en creditos, o null si el proveedor no lo expone.
 * Nunca lanza: quedarse sin lectura de saldo no debe tumbar un lote.
 */
export async function saldoActual({ apiKey, proveedor = 'kie' }) {
  try {
    const p = getProveedor(proveedor);
    if (typeof p.saldo !== 'function') return null;
    return leerNumero(await p.saldo(apiKey));
  } catch {
    return null;
  }
}

/**
 * Pre-vuelo. Lanza ErrorVideo(INSUFFICIENT_CREDITS) si el saldo no alcanza para
 * el trabajo COMPLETO.
 *
 * Si el proveedor no reporta saldo, deja pasar: mejor intentar que bloquear al
 * cliente por una lectura que no existe. Se avisa en el resultado.
 */
export async function verificarSaldo({ apiKey, proveedor = 'kie', costoEstimadoUsd, etiqueta = 'el trabajo' }) {
  const requeridos = usdACreditos(costoEstimadoUsd);
  const saldo = await saldoActual({ apiKey, proveedor });

  if (saldo == null) {
    return { saldo: null, requeridos, suficiente: true, verificado: false };
  }

  if (saldo < requeridos) {
    throw new ErrorVideo(
      CODIGOS.INSUFFICIENT_CREDITS,
      `Saldo insuficiente para ${etiqueta}: hacen falta ~${requeridos} creditos y hay ${saldo}.`,
      { saldo, requeridos, proveedor }
    );
  }

  return { saldo, requeridos, suficiente: true, verificado: true };
}

/**
 * Contador de gasto de un trabajo. Suma lo que REALMENTE devuelve el proveedor
 * y cae al estimado solo cuando la API no reporta creditos.
 */
export function contadorDeGasto({ estimadoPorClipUsd = 0.4 } = {}) {
  let creditos = 0;
  let usd = 0;
  let reportados = 0;
  let estimados = 0;

  return {
    registrar(creditosDelProveedor) {
      if (creditosDelProveedor != null) {
        creditos += creditosDelProveedor;
        usd += creditosDelProveedor / CREDITOS_POR_USD;
        reportados++;
      } else {
        usd += estimadoPorClipUsd;
        estimados++;
      }
    },
    get total() {
      return {
        creditos: reportados ? creditos : null,
        usd: Math.round(usd * 100) / 100,
        clips_reportados: reportados,
        clips_estimados: estimados,
        // Si algun clip no reporto, el total es parcialmente estimado. Se dice.
        exacto: estimados === 0,
      };
    },
  };
}
