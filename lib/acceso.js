/**
 * PUERTA DE ACCESO — FIRMA COMPARTIDA
 * -----------------------------------------------------------------------------
 * Lo usan la ruta (runtime Node) y el middleware (runtime Edge), asi que se
 * escribe con Web Crypto, que existe en los dos. `crypto.createHmac` de Node NO
 * esta disponible en Edge: usarlo dejaria el middleware roto en produccion y,
 * como el middleware protege TODA la aplicacion, nadie podria entrar.
 *
 * Por que una firma y no un texto fijo: este repositorio es publico. Antes la
 * cookie valia literalmente '1407_granted', escrito en el codigo, asi que
 * cualquiera podia ponersela a mano y saltarse el formulario — y entrar
 * significa gastar los creditos de Kie de la cuenta.
 */

const CODIGO_POR_DEFECTO = '1407';

export function codigoEsperado() {
  return process.env.PH_ACCESS_CODE || CODIGO_POR_DEFECTO;
}

export function usandoCodigoPublico() {
  return !process.env.PH_ACCESS_CODE;
}

/**
 * Secreto con el que se firma. Se prefiere PH_ACCESS_SECRET; si no existe se
 * deriva de la llave de Kie, que ya es secreta y estable entre despliegues, asi
 * las sesiones abiertas no se caen en cada deploy.
 */
function secreto() {
  return process.env.PH_ACCESS_SECRET || process.env.KIE_API_KEY || 'ph-system-sin-secreto';
}

let cacheFirma = null;

/** Valor que debe llevar la cookie. Estable mientras no cambie el secreto. */
export async function firmaDeAcceso() {
  if (cacheFirma) return cacheFirma;

  const enc = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    'raw',
    enc.encode(secreto()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', clave, enc.encode('ph-access-v1'));

  cacheFirma = Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  return cacheFirma;
}

/** Comparacion en tiempo constante: no filtra el valor a base de medir. */
export function igualSeguro(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  if (x.length !== y.length) return false;

  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
