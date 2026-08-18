/**
 * PH TikTok Shop Engine — CLIENTE LLM
 * -----------------------------------------------------------------------------
 * Motor de texto: escribe los guiones y lee las fotos y los PDFs del cliente.
 *
 * ═══ POR QUE ESTO TIENE FAILOVER ═══
 *
 * El 12/08/2026 el proxy de Claude de Kie empezo a devolver 500 en TODAS las
 * llamadas ("Server exception, please try again later", 6 de 6 intentos). El
 * software entero se quedo muerto: sin ficha de producto, sin guiones, sin nada
 * — aunque la llave de Anthropic ya estaba configurada y funcionaba.
 *
 * Un proveedor caido no puede tumbar el producto. Ahora se prueban en orden
 * todos los proveedores que tengan llave, y solo se falla si fallan todos.
 *
 * .env:
 *   LLM_PROVIDER = kie | anthropic | openai   (cual se intenta PRIMERO)
 *   LLM_MODEL    = opcional, fuerza el modelo del proveedor principal
 *
 *   KIE_API_KEY=...        # kie: una cuenta para video, imagen y texto
 *   ANTHROPIC_API_KEY=...  # anthropic directo
 *   OPENAI_API_KEY=...     # openai o compatible (con LLM_BASE_URL)
 */

const DEFAULT_MODELS = {
  kie: 'claude-sonnet-5',
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4.1',
};

const NOMBRE_LLAVE = {
  kie: 'KIE_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

const PROVIDER = () => (process.env.LLM_PROVIDER || 'kie').toLowerCase();

function llaveDe(id) {
  return process.env[NOMBRE_LLAVE[id]] || null;
}

/**
 * Proveedores que se pueden usar ahora mismo, en orden de preferencia:
 * primero el configurado, despues el resto que tenga llave.
 *
 * LLM_MODEL y LLM_BASE_URL solo aplican al proveedor principal: forzarlos en el
 * de respaldo seria pedirle a Anthropic un modelo de OpenAI, o al reves.
 */
export function cadenaDeProveedores() {
  const principal = PROVIDER();
  const orden = [principal, ...Object.keys(NOMBRE_LLAVE).filter((id) => id !== principal)];

  return orden
    .filter((id) => llaveDe(id))
    .map((id) => ({
      id,
      key: llaveDe(id),
      modelo: (id === principal && process.env.LLM_MODEL) || DEFAULT_MODELS[id],
      base: id === principal && process.env.LLM_BASE_URL ? process.env.LLM_BASE_URL : baseDe(id),
      formato: id === 'openai' ? 'openai' : 'anthropic',
    }));
}

function baseDe(id) {
  if (id === 'kie') return `${process.env.KIE_BASE_URL || 'https://api.kie.ai'}/claude`;
  if (id === 'openai') return 'https://api.openai.com/v1';
  return 'https://api.anthropic.com';
}

// ─── Imagenes: URL vs base64 ─────────────────────────────────────────────────
//
// El proxy de Claude de Kie ACEPTA la peticion (HTTP 200) pero DESCARTA las
// imagenes enviadas como {source:{type:'url'}}. El modelo contesta "no puedo ver
// la imagen adjunta" y, como el resto del prompt si llega, devuelve algo que
// parece una respuesta valida. Por eso el fallo era invisible: la ficha del
// producto salia vacia sin que nadie viera un error.
//
// Contra Kie, entonces, las imagenes van SIEMPRE inline en base64.
// Anthropic si soporta URL y ahi se aprovecha: es mas rapido y no gasta ancho
// de banda nuestro.
const SOPORTA_IMAGEN_POR_URL = { anthropic: true, kie: false, openai: true };

// La misma foto (avatar, producto) se manda en muchas llamadas del mismo lote,
// asi que cachearla ahorra descargas. Pero cada entrada es la imagen ENTERA en
// base64 (hasta 4.5 MB), y el servidor es un proceso largo: sin limite, esto
// crece hasta tumbarlo. Se acota por numero y por peso total, tirando la
// entrada mas antigua (LRU sencillo sobre el orden de insercion del Map).
const cacheImagenes = new Map();
const MAX_ENTRADAS = 12;
const MAX_BYTES_CACHE = 40 * 1024 * 1024;
let bytesEnCache = 0;

function guardarEnCache(url, uri) {
  while (cacheImagenes.size >= MAX_ENTRADAS || bytesEnCache + uri.length > MAX_BYTES_CACHE) {
    const masVieja = cacheImagenes.keys().next();
    if (masVieja.done) break;
    bytesEnCache -= cacheImagenes.get(masVieja.value).length;
    cacheImagenes.delete(masVieja.value);
  }
  cacheImagenes.set(url, uri);
  bytesEnCache += uri.length;
}
const LIMITE_BYTES = 4.5 * 1024 * 1024; // Anthropic corta en ~5 MB por imagen.

async function aDataUri(url) {
  if (cacheImagenes.has(url)) return cacheImagenes.get(url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`no se pudo descargar la imagen (${res.status}): ${url}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > LIMITE_BYTES) {
    throw new Error(`la imagen pesa ${(buffer.length / 1024 / 1024).toFixed(1)} MB y el limite es 4.5 MB: ${url}`);
  }

  const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  const uri = `data:${mime};base64,${buffer.toString('base64')}`;
  guardarEnCache(url, uri);
  return uri;
}

/** Deja cada imagen en el formato que ese proveedor entiende de verdad. */
async function prepararImagenes(prov, imagenes) {
  if (!imagenes.length) return [];
  if (SOPORTA_IMAGEN_POR_URL[prov.id] !== false) return imagenes;

  return Promise.all(
    imagenes.map(async (img) => (img.startsWith('data:') ? img : aDataUri(img)))
  );
}

/**
 * Tiempo maximo por intento.
 *
 * fetch sin timeout espera indefinidamente. Cuando el proveedor acepta la
 * conexion y luego se queda mudo —que es justo lo que hace Kie cuando falla—,
 * el trabajo entero se queda colgado en "Interpretando tu encargo..." sin
 * fallar nunca y sin avanzar. Desde fuera parece que carga eternamente.
 *
 * Con limite, un proveedor mudo se trata como cualquier otro fallo: se
 * reintenta, y si no, se pasa al siguiente.
 */
const TIMEOUT_MS = Number(process.env.PH_LLM_TIMEOUT_MS) || 90000;

// ─── Errores del LLM ─────────────────────────────────────────────────────────

class ErrorLLM extends Error {
  constructor(mensaje, { proveedor, status, reintentable }) {
    super(mensaje);
    this.name = 'ErrorLLM';
    this.proveedor = proveedor;
    this.status = status ?? null;
    // 429 y 5xx se reintentan; 400/401/403 son culpa nuestra y no mejoran solos.
    this.reintentable = reintentable ?? (status === 429 || (status >= 500 && status < 600));
  }
}

/** fetch con tiempo limite: un proveedor mudo no puede colgar el trabajo. */
async function pedirConLimite(url, opts) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new ErrorLLM(`no respondió en ${TIMEOUT_MS / 1000}s`, { proveedor: 'llm', reintentable: true });
    }
    throw e;
  }
}

// ─── Formato Anthropic (lo usan kie y anthropic) ─────────────────────────────

async function llamarAnthropic(prov, { system, user, imagenes = [], documentos = [], maxTokens }) {
  const content = [];

  for (const doc of documentos) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: doc },
    });
  }
  for (const img of await prepararImagenes(prov, imagenes)) {
    // Las imagenes pueden venir como URL o como data URI. El data URI evita
    // subir el archivo a un hosting solo para que el LLM lo vuelva a bajar.
    const dataUri = /^data:(.+?);base64,(.*)$/s.exec(img);
    content.push(
      dataUri
        ? { type: 'image', source: { type: 'base64', media_type: dataUri[1], data: dataUri[2] } }
        : { type: 'image', source: { type: 'url', url: img } }
    );
  }
  content.push({ type: 'text', text: user });

  const headers = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
  if (prov.id === 'kie') headers.authorization = `Bearer ${prov.key}`;
  else headers['x-api-key'] = prov.key;

  const res = await pedirConLimite(`${prov.base}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: prov.modelo,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  const txt = await res.text();

  if (!res.ok) {
    throw new ErrorLLM(`${prov.id} ${res.status}: ${detalle(txt)}`, { proveedor: prov.id, status: res.status });
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new ErrorLLM(`${prov.id} devolvio una respuesta no-JSON: ${txt.slice(0, 200)}`, {
      proveedor: prov.id,
      reintentable: true,
    });
  }

  // Kie responde 200 con el error dentro del cuerpo (por ejemplo
  // {"code":500,"msg":"The page does not exist"} cuando el modelo no existe).
  // Sin esto, el fallo llegaba disfrazado de "el modelo devolvio una respuesta
  // vacia" y mandaba a revisar la llave, que no tenia nada que ver.
  if (data.error || (data.code && data.code !== 200)) {
    const msg = data.error?.message || data.msg || JSON.stringify(data).slice(0, 200);
    throw new ErrorLLM(`${prov.id}: ${msg}`, {
      proveedor: prov.id,
      status: Number(data.code) || null,
      reintentable: true,
    });
  }

  const texto = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  if (!texto.trim()) {
    throw new ErrorLLM(`${prov.id} devolvio una respuesta vacia (modelo ${prov.modelo}).`, {
      proveedor: prov.id,
      reintentable: true,
    });
  }

  verificarQueVioLasImagenes(texto, imagenes, prov.id);
  return texto;
}

// ─── Formato OpenAI ──────────────────────────────────────────────────────────

async function llamarOpenAI(prov, { system, user, imagenes = [], maxTokens }) {
  const partes = [{ type: 'text', text: user }];
  for (const img of imagenes) partes.push({ type: 'image_url', image_url: { url: img } });

  const res = await pedirConLimite(`${prov.base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${prov.key}` },
    body: JSON.stringify({
      model: prov.modelo,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: imagenes.length ? partes : partes[0].text },
      ],
    }),
  });

  const txt = await res.text();
  if (!res.ok) {
    throw new ErrorLLM(`openai ${res.status}: ${detalle(txt)}`, { proveedor: 'openai', status: res.status });
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new ErrorLLM(`openai devolvio una respuesta no-JSON: ${txt.slice(0, 200)}`, {
      proveedor: 'openai',
      reintentable: true,
    });
  }

  const texto = data.choices?.[0]?.message?.content || '';
  if (!texto.trim()) {
    throw new ErrorLLM(`openai devolvio una respuesta vacia (modelo ${prov.modelo}).`, {
      proveedor: 'openai',
      reintentable: true,
    });
  }

  verificarQueVioLasImagenes(texto, imagenes, 'openai');
  return texto;
}

/**
 * Detecta que el modelo NO recibio las imagenes que le mandamos.
 *
 * Es el fallo mas peligroso de todos porque no da error: el proveedor responde
 * 200, el modelo contesta "no puedo ver la imagen" y el sistema se queda con una
 * ficha de producto vacia, como si la foto simplemente no fuera clara. El video
 * sale sin saber que es el producto y nadie se entera de por que.
 *
 * Convertirlo en excepcion hace que el failover pruebe otro proveedor, que es
 * exactamente lo que hay que hacer.
 */
const SIN_IMAGEN = [
  /no puedo ver (la|las) imagen/i,
  /no pude recibir ninguna imagen/i,
  /no (recibi|recibí) ninguna imagen/i,
  /no se (cargo|cargó) correctamente/i,
  /(can'?t|cannot|unable to) (see|view|access) the (image|attachment)/i,
  /no image (was )?(provided|attached|received)/i,
  /invalid or unsupported/i,
];

function verificarQueVioLasImagenes(texto, imagenes, proveedor) {
  if (!imagenes.length) return;
  if (!SIN_IMAGEN.some((re) => re.test(texto))) return;

  throw new ErrorLLM(
    `${proveedor} acepto la peticion pero descarto las imagenes (el modelo respondio que no las ve).`,
    // Reintentar con el mismo proveedor no cambia nada: es como trata las
    // imagenes. Se pasa al siguiente.
    { proveedor, reintentable: false }
  );
}

function detalle(txt) {
  try {
    const d = JSON.parse(txt);
    return d.error?.message || d.msg || d.message || txt.slice(0, 200);
  } catch {
    return txt.slice(0, 200);
  }
}

// ─── Cortacircuitos ──────────────────────────────────────────────────────────
//
// Cuando un proveedor esta caido de verdad (Kie devolvia 500 en 6 de 6), volver
// a intentarlo en CADA llamada cuesta ~3 s tirados. Un lote hace facilmente 10
// llamadas: medio minuto regalado.
//
// Tras 2 fallos seguidos, el proveedor se aparta 5 minutos. Se sigue usando si
// es el unico que hay: mas vale intentarlo que no hacer nada.

const CIRCUITO_FALLOS = 2;
const CIRCUITO_MS = 5 * 60 * 1000;
const circuito = new Map(); // id -> { fallos, hasta }

function circuitoAbierto(id) {
  const c = circuito.get(id);
  return Boolean(c && c.hasta > Date.now());
}

function anotarFallo(id) {
  const c = circuito.get(id) || { fallos: 0, hasta: 0 };
  c.fallos++;
  if (c.fallos >= CIRCUITO_FALLOS) {
    c.hasta = Date.now() + CIRCUITO_MS;
    console.warn(`[PH TikTok] LLM: ${id} apartado ${CIRCUITO_MS / 60000} min tras ${c.fallos} fallos seguidos.`);
  }
  circuito.set(id, c);
}

function anotarExito(id) {
  if (circuito.has(id)) circuito.delete(id);
}

// ─── Orquestacion: reintento + failover ──────────────────────────────────────

const REINTENTOS_POR_PROVEEDOR = 2; // 3 intentos en total por proveedor
const ESPERA_MS = [800, 2500];

async function conReintento(prov, args) {
  let ultimo;

  for (let intento = 0; intento <= REINTENTOS_POR_PROVEEDOR; intento++) {
    try {
      return prov.formato === 'openai' ? await llamarOpenAI(prov, args) : await llamarAnthropic(prov, args);
    } catch (e) {
      ultimo = e instanceof ErrorLLM ? e : new ErrorLLM(`${prov.id}: ${e.message}`, { proveedor: prov.id, reintentable: true });

      // Un 401 o un 400 no mejora esperando: se pasa al siguiente proveedor ya.
      if (!ultimo.reintentable) break;
      if (intento < REINTENTOS_POR_PROVEEDOR) {
        await new Promise((r) => setTimeout(r, ESPERA_MS[intento]));
      }
    }
  }
  throw ultimo;
}

export async function completar({ system, user, imagenes = [], documentos = [], textoAdjunto, maxTokens = 2000 }) {
  const cadena = cadenaDeProveedores();

  if (!cadena.length) {
    throw new Error(
      `Falta la llave del modelo de texto. Agrega ${NOMBRE_LLAVE[PROVIDER()]} (o cualquiera de ${Object.values(NOMBRE_LLAVE).join(', ')}) en Railway -> Variables.`
    );
  }

  const userFinal = textoAdjunto ? `${user}\n\n---\n${textoAdjunto}` : user;
  const fallos = [];

  // Los apartados por el cortacircuitos van al final: si los demas responden,
  // ni se tocan; si no responde nadie, se intentan igual antes de rendirse.
  const sanos = cadena.filter((p) => !circuitoAbierto(p.id));
  const apartados = cadena.filter((p) => circuitoAbierto(p.id));

  for (const prov of [...sanos, ...apartados]) {
    // OpenAI no recibe PDFs en este flujo; si hay documentos, no es candidato.
    if (documentos.length && prov.formato === 'openai') {
      fallos.push('openai: no recibe PDFs en este flujo');
      continue;
    }

    try {
      const texto = await conReintento(prov, { system, user: userFinal, imagenes, documentos, maxTokens });
      anotarExito(prov.id);
      if (fallos.length) {
        console.warn(`[PH TikTok] LLM: ${fallos.join(' | ')} -> se resolvio con ${prov.id}`);
      }
      return texto;
    } catch (e) {
      console.warn(`[PH TikTok] LLM ${prov.id} fallo: ${e.message}`);
      anotarFallo(prov.id);
      fallos.push(e.message);
    }
  }

  // Mensaje honesto: dice QUE fallo en cada proveedor, en vez de mandar a
  // revisar una llave que puede estar perfectamente bien.
  throw new Error(`Ningun proveedor de texto respondio. ${fallos.join(' | ')}`);
}

export function extraerJSON(texto) {
  if (!texto) throw new Error('El modelo devolvio una respuesta vacia.');
  const limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (inicio === -1 || fin === -1) throw new Error(`No se pudo leer JSON: ${limpio.slice(0, 200)}`);
    return JSON.parse(limpio.slice(inicio, fin + 1));
  }
}

export async function completarJSON(args) {
  const texto = await completar(args);
  try {
    return extraerJSON(texto);
  } catch {
    // Segunda oportunidad solo por formato: la llamada ya llego bien, el modelo
    // simplemente no devolvio JSON limpio.
    return extraerJSON(
      await completar({
        ...args,
        user: `${args.user}\n\nIMPORTANTE: tu respuesta anterior no fue JSON valido. Devuelve SOLO el objeto JSON.`,
      })
    );
  }
}

export function llmConfigurado() {
  return cadenaDeProveedores().length > 0;
}

export function infoLLM() {
  const cadena = cadenaDeProveedores();
  const principal = cadena[0];
  return {
    proveedor: principal?.id || PROVIDER(),
    modelo: principal?.modelo || DEFAULT_MODELS[PROVIDER()],
    configurado: cadena.length > 0,
    // Que se vea en la UI que hay red de seguridad, y cual.
    respaldos: cadena.slice(1).map((p) => p.id),
  };
}
