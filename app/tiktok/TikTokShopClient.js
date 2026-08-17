'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ls = (k) => (typeof window !== 'undefined' ? localStorage.getItem(k) || '' : '');

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(ls('muapi_key') ? { 'x-api-key': ls('muapi_key') } : {}),
      ...(ls('kie_key') ? { 'x-kie-key': ls('kie_key') } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const ESTADOS = {
  en_cola: 'En cola',
  analizando: 'Leyendo el producto',
  guionizando: 'Escribiendo guiones',
  generando: 'Generando videos',
  terminado: 'Listo',
  error: 'Error',
};

// ─── Subida de imagen ────────────────────────────────────────────────────────

function Dropzone({ label, ayuda, url, onUrl }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  async function subir(file) {
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { url } = await api('/api/tiktok/upload', { method: 'POST', body: form });
      onUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-[11px] text-zinc-500">{ayuda}</span>
      </div>
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          subir(e.dataTransfer.files?.[0]);
        }}
        className="relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-violet-500/25 bg-violet-500/[0.03] transition hover:border-violet-500/60"
      >
        {url ? (
          <>
            <img src={url} alt={label} className="h-full w-full object-cover" />
            <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white">
              Cambiar
            </span>
          </>
        ) : (
          <span className="px-4 text-center text-xs text-zinc-500">
            {subiendo ? 'Subiendo…' : 'Arrastra la imagen o haz clic'}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => subir(e.target.files?.[0])}
      />
    </div>
  );
}

// ─── Tarjeta de resultado ────────────────────────────────────────────────────

function TarjetaVideo({ jobId, v, onVeredicto }) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const enProceso = ['pendiente', 'guion_listo', 'generando'].includes(v.estado);

  function copiar(texto) {
    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0d0d]">
      <div className="relative aspect-[9/16] bg-black">
        {v.videoUrl ? (
          <video src={v.videoUrl} controls playsInline className="h-full w-full object-cover" />
        ) : v.frameUrl ? (
          <img src={v.frameUrl} alt="" className="h-full w-full object-cover opacity-50" />
        ) : null}

        {enProceso && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <span className="px-4 text-[11px] text-zinc-300">{v.mensaje || 'En cola…'}</span>
          </div>
        )}
        {v.estado === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-950/40 p-4 text-center">
            {/* El error viene tipado desde el motor: {codigo, mensaje, sugerencia, taskId}.
                Se sigue tolerando el string suelto de los jobs viejos. */}
            {typeof v.error === 'object' && v.error?.codigo && (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-200">
                {v.error.codigo}
              </span>
            )}
            <span className="text-[11px] text-red-300">{v.error?.mensaje || v.error}</span>
            {v.error?.sugerencia && <span className="text-[10px] text-red-400/80">{v.error.sugerencia}</span>}
            {v.error?.taskId && (
              <span className="text-[9px] text-red-400/60">taskId: {v.error.taskId}</span>
            )}
          </div>
        )}

        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
          {v.plan?.familia_hook?.replace('_', ' ')}
          {v.idioma && <span className="ml-1 text-zinc-400">· {v.idioma.toUpperCase()}</span>}
        </span>
        {v.plan?.hereda && (
          <span className="absolute right-2 top-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
            hereda {v.plan.hereda}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
          {v.guion?.hook || '—'}
        </p>
        <p className="text-[11px] text-zinc-500">
          {v.plan?.estrategia} · {v.plan?.angulo_venta}
        </p>

        {v.guion?.cumplimiento?.riesgo === 'alto' && (
          <p className="rounded bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
            ⚠ {v.guion.cumplimiento.notas}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {v.videoUrl && (
            <a
              href={v.videoUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
            >
              Descargar
            </a>
          )}
          {v.guion?.caption && (
            <button
              onClick={() => copiar(`${v.guion.caption}\n\n${(v.guion.hashtags || []).join(' ')}`)}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
            >
              {copiado ? 'Copiado ✓' : 'Copiar caption'}
            </button>
          )}
          <button
            onClick={() => setAbierto((a) => !a)}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
          >
            {abierto ? 'Ocultar guion' : 'Ver guion'}
          </button>
        </div>

        {v.videoUrl && (
          <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
            <span className="text-[10px] text-zinc-500">Resultado real:</span>
            {['ganador', 'neutro', 'perdedor'].map((r) => (
              <button
                key={r}
                onClick={() => onVeredicto(jobId, v.id, r)}
                className={`rounded px-2 py-0.5 text-[10px] capitalize transition ${
                  v.veredicto === r
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {abierto && v.guion && (
          <div className="space-y-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-zinc-400">
            <p className="text-zinc-300">{v.guion.dialogo}</p>
            {(v.guion.beats || []).map((b, i) => (
              <p key={i}>
                <span className="font-semibold uppercase text-violet-400">{b.beat}</span> — {b.accion}
              </p>
            ))}
            {v.guion.por_que_funciona && (
              <p className="italic text-zinc-500">💡 {v.guion.por_que_funciona}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Panel de conocimiento (los PDFs del cliente) ───────────────────────────

function PanelConocimiento({ conocimiento, onActualizar }) {
  const input = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');

  async function subirPDF(file) {
    if (!file) return;
    setCargando(true);
    setError(null);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api('/api/tiktok/knowledge', { method: 'POST', body: form });
      setMsg(r.mensaje);
      onActualizar(r.conocimiento);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function subirTexto() {
    if (!texto.trim()) return;
    setCargando(true);
    setError(null);
    setMsg(null);
    try {
      const r = await api('/api/tiktok/knowledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto, nombre: 'texto pegado' }),
      });
      setMsg(r.mensaje);
      setTexto('');
      onActualizar(r.conocimiento);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  const c = conocimiento?.conteo || {};
  const fuentes = conocimiento?.fuentes || [];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-5">
      <button onClick={() => setAbierto((a) => !a)} className="flex w-full items-center justify-between">
        <div className="text-left">
          <p className="text-sm font-semibold text-white">Estructura del cliente</p>
          <p className="text-[11px] text-zinc-500">
            {fuentes.length
              ? `${fuentes.length} documento${fuentes.length > 1 ? 's' : ''} cargado${fuentes.length > 1 ? 's' : ''} · ${c.familias_hook} familias de hook`
              : 'Sube el PDF con el método del cliente'}
          </p>
        </div>
        <span className="text-xs text-violet-400">{abierto ? 'Cerrar' : 'Abrir'}</span>
      </button>

      {abierto && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Beats', c.beats],
              ['Hooks', c.familias_hook],
              ['Estrategias', c.estrategias],
              ['CTAs', c.cta_naturales],
              ['Reglas', c.reglas_duras],
              ['Prohibidas', c.frases_prohibidas],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/[0.06] py-2">
                <p className="text-base font-bold text-white">{v ?? '—'}</p>
                <p className="text-[10px] text-zinc-500">{k}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => input.current?.click()}
            disabled={cargando}
            className="w-full rounded-lg border border-dashed border-violet-500/30 py-3 text-xs text-zinc-400 hover:border-violet-500/60 disabled:opacity-50"
          >
            {cargando ? 'Leyendo el documento…' : 'Subir PDF del cliente'}
          </button>
          <input
            ref={input}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => subirPDF(e.target.files?.[0])}
          />

          <details>
            <summary className="cursor-pointer text-[11px] text-zinc-500">o pegar el texto</summary>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              placeholder="Pega aquí hooks, estructuras o reglas nuevas…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none focus:border-violet-500/60"
            />
            <button
              onClick={subirTexto}
              disabled={cargando || !texto.trim()}
              className="mt-2 w-full rounded-lg bg-violet-600/80 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Incorporar texto
            </button>
          </details>

          {fuentes.length > 0 && (
            <div className="space-y-1 border-t border-white/[0.06] pt-2">
              {fuentes.map((f, i) => (
                <p key={i} className="text-[10px] text-zinc-500">
                  📄 {f.nombre} — {f.elementos?.hooks || 0} hooks, {f.elementos?.reglas || 0} reglas
                </p>
              ))}
            </div>
          )}

          {msg && <p className="rounded bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">{msg}</p>}
          {error && <p className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function TikTokShopClient() {
  const [meta, setMeta] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [productoUrl, setProductoUrl] = useState(null);

  const [producto, setProducto] = useState({
    nombre: '',
    descripcion: '',
    beneficio: '',
    publico: '',
    oferta: '',
    texto_etiqueta: '',
    marca: '',
    notas: '',
  });
  const [avatar, setAvatar] = useState({ descripcion: '', tono: '' });

  // Lo que el sistema entendió de la foto del producto.
  const [lectura, setLectura] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [motorCaido, setMotorCaido] = useState(null);

  const [motor, setMotor] = useState(null);
  const [conocimiento, setConocimiento] = useState(null);
  const [cantidad, setCantidad] = useState(4);
  const [idioma, setIdioma] = useState('es');
  const [iterar, setIterar] = useState(false);
  const [modoLargo, setModoLargo] = useState(false);
  const [duracionLarga, setDuracionLarga] = useState(30);

  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/api/tiktok/meta')
      .then((m) => {
        setMeta(m);
        setConocimiento(m.conocimiento);
        setMotor((prev) => prev || m.motor_default);
      })
      .catch((e) => setError(e.message));
  }, []);

  // En cuanto hay foto del producto, se analiza. Corregir aquí es gratis;
  // descubrirlo en el video ya está pagado.
  useEffect(() => {
    if (!productoUrl) {
      setLectura(null);
      return;
    }
    let vivo = true;
    setLeyendo(true);
    setMotorCaido(null);
    api('/api/tiktok/producto', { method: 'POST', body: JSON.stringify({ productoUrl }) })
      .then((r) => {
        if (!vivo) return;
        setLectura(r);
        // Se rellena lo que la vista dedujo, sin pisar lo que el vendedor escribió.
        setProducto((p) => ({
          ...p,
          nombre: p.nombre || r.ficha?.nombre || '',
          descripcion: p.descripcion || r.ficha?.descripcion || '',
          beneficio: p.beneficio || r.ficha?.beneficio || '',
          marca: p.marca || r.ficha?.identidad?.marca_visible || '',
          texto_etiqueta: p.texto_etiqueta || (r.ficha?.identidad?.texto_etiqueta || []).join('\n'),
        }));
      })
      .catch((e) => {
        if (!vivo) return;
        setLectura(null);
        // El motor de texto caido es un problema del sistema, no del vendedor:
        // se dice tal cual en vez de pedirle que escriba el contexto a mano.
        setMotorCaido(e.message);
      })
      .finally(() => vivo && setLeyendo(false));

    return () => {
      vivo = false;
    };
  }, [productoUrl]);

  // Polling del job
  useEffect(() => {
    if (!jobId) return;
    let vivo = true;
    const tick = async () => {
      try {
        const j = await api(`/api/tiktok/job/${jobId}`);
        if (!vivo) return;
        setJob(j);
        if (j.estado !== 'terminado' && j.estado !== 'error') setTimeout(tick, 3000);
      } catch (e) {
        if (vivo) setError(e.message);
      }
    };
    tick();
    return () => {
      vivo = false;
    };
  }, [jobId]);

  const motorActual = meta?.motores?.find((m) => m.id === motor);
  const costo = motorActual ? (motorActual.costo * cantidad).toFixed(2) : '—';
  const listo = avatarUrl && (productoUrl || producto.nombre);

  async function generar() {
    setError(null);
    setEnviando(true);
    try {
      if (modoLargo) {
        const { jobId } = await api('/api/tiktok/generate-largo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            avatarUrl,
            productoUrl,
            producto,
            duracionDeseadaSeg: duracionLarga,
            idioma,
          }),
        });
        setJob(null);
        setJobId(jobId);
      } else {
        const { jobId } = await api('/api/tiktok/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            avatarUrl,
            productoUrl,
            producto,
            avatar,
            cantidad,
            motor,
            idioma,
            iterar,
          }),
        });
        setJob(null);
        setJobId(jobId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const marcar = useCallback(async (jobId, variacionId, veredicto) => {
    try {
      await api('/api/tiktok/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId, variacionId, veredicto }),
      });
      setJob((j) => ({
        ...j,
        variaciones: j.variaciones.map((v) => (v.id === variacionId ? { ...v, veredicto } : v)),
      }));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const campo = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/60';

  return (
    <div className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">TikTok Shop Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Avatar + producto → videos con estructura de venta, listos para subir.
          </p>
          {meta && !meta.llm?.configurado && (
            <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Falta la llave del modelo de texto ({meta.llm?.proveedor}). Agrégala en las variables de entorno.
            </p>
          )}
          {meta && !meta.proveedores?.some((p) => p.configurado) && (
            <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Ningún proveedor de generación configurado. Agrega KIE_API_KEY.
            </p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ── Panel de control ── */}
          <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-5">
            <div className="grid grid-cols-2 gap-3">
              <Dropzone label="Avatar" ayuda="foto de la persona" url={avatarUrl} onUrl={setAvatarUrl} />
              <Dropzone label="Producto" ayuda="foto limpia" url={productoUrl} onUrl={setProductoUrl} />
            </div>

            {/* ── Contexto del producto ──
                Lo que el sistema leyó de la foto, y lo que el vendedor puede
                corregir. Lo escrito aquí siempre gana sobre lo que dedujo la IA. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Contexto del producto
                </label>
                {leyendo && (
                  <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border border-violet-500 border-t-transparent" />
                    leyendo la foto…
                  </span>
                )}
              </div>

              {motorCaido && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-[11px] font-semibold text-red-300">
                    El motor de texto no responde
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-red-200/70">
                    Esto no se arregla escribiendo el contexto: el guionista también necesita el
                    modelo. Hay que revisar la llave del modelo de texto en Railway.
                  </p>
                  <p className="mt-1 break-words text-[10px] text-red-200/50">{motorCaido}</p>
                </div>
              )}

              {!motorCaido && lectura?.necesita_contexto && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-300">
                    La foto no alcanza para saber qué es el producto
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-amber-200/70">
                    Escríbelo abajo. Sin esto, el guion habla en abstracto y el video puede no
                    parecerse a tu producto.
                  </p>
                  {lectura.falta_contexto?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {lectura.falta_contexto.map((f, i) => (
                        <li key={i} className="text-[10px] text-amber-200/60">
                          · {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {lectura?.identidad && !lectura.necesita_contexto && (
                <details className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-emerald-300">
                    Producto identificado — ver lo que se le manda al modelo
                  </summary>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-200/70">
                    {lectura.identidad}
                  </p>
                  <p className="mt-1.5 text-[10px] text-emerald-200/50">
                    Si algo de esto no cuadra con tu producto, corrígelo abajo.
                  </p>
                </details>
              )}

              <input
                className={campo}
                placeholder="Nombre del producto"
                value={producto.nombre}
                onChange={(e) => setProducto({ ...producto, nombre: e.target.value })}
              />
              <input
                className={campo}
                placeholder="Qué es y qué hace (1 frase)"
                value={producto.descripcion}
                onChange={(e) => setProducto({ ...producto, descripcion: e.target.value })}
              />
              <input
                className={campo}
                placeholder="Beneficio principal"
                value={producto.beneficio}
                onChange={(e) => setProducto({ ...producto, beneficio: e.target.value })}
              />
              <input
                className={campo}
                placeholder="Marca visible en el envase (opcional)"
                value={producto.marca}
                onChange={(e) => setProducto({ ...producto, marca: e.target.value })}
              />
              <textarea
                className={`${campo} min-h-[52px] resize-y`}
                placeholder="Texto exacto de la etiqueta, una línea por renglón (opcional)"
                value={producto.texto_etiqueta}
                onChange={(e) => setProducto({ ...producto, texto_etiqueta: e.target.value })}
              />
              <input
                className={campo}
                placeholder="Notas para el guionista (opcional)"
                value={producto.notas}
                onChange={(e) => setProducto({ ...producto, notas: e.target.value })}
              />
              <input
                className={campo}
                placeholder="Cómo habla el avatar (opcional)"
                value={avatar.tono}
                onChange={(e) => setAvatar({ ...avatar, tono: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tipo de video
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setModoLargo(false)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    !modoLargo
                      ? 'border-violet-500/60 bg-violet-500/10 text-white'
                      : 'border-white/10 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  Corto
                </button>
                <button
                  onClick={() => setModoLargo(true)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    modoLargo
                      ? 'border-violet-500/60 bg-violet-500/10 text-white'
                      : 'border-white/10 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  Largo
                </button>
              </div>
            </div>

            {!modoLargo && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Motor
                </label>
                <div className="space-y-2">
                  {(meta?.motores || []).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMotor(m.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        motor === m.id
                          ? 'border-violet-500/60 bg-violet-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {m.nombre}
                          {m.referenciaDirecta && (
                            <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-normal text-emerald-300">
                              1 paso
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-violet-300">~${m.costo.toFixed(2)}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{m.para}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  {modoLargo ? 'Duración (seg)' : 'Variaciones'}
                </label>
                {modoLargo ? (
                  <input
                    type="number"
                    min={10}
                    step={10}
                    className={campo}
                    value={duracionLarga}
                    onChange={(e) => setDuracionLarga(Number(e.target.value))}
                  />
                ) : (
                  <select
                    className={campo}
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Idioma</label>
                <select className={campo} value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                  {(meta?.idiomas || [{ id: 'es', nombre: 'Español' }]).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!modoLargo && (
              <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={iterar}
                  onChange={(e) => setIterar(e.target.checked)}
                  className="mt-0.5 accent-violet-500"
                />
                <span>
                  Iterar sobre ganadores
                  <span className="block text-[10px] text-zinc-600">
                    Media tanda hereda lo que ya vendió.
                  </span>
                </span>
              </label>
            )}

            <div className="border-t border-white/[0.07] pt-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Costo estimado</span>
                <span className="font-semibold text-white">${costo}</span>
              </div>
              <button
                onClick={generar}
                disabled={!listo || enviando}
                className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
              >
                {enviando
                  ? 'Enviando…'
                  : modoLargo
                  ? `Generar video de ${duracionLarga}s`
                  : `Generar ${cantidad} video${cantidad > 1 ? 's' : ''}`}
              </button>
              {!listo && (
                <p className="mt-2 text-center text-[11px] text-zinc-600">
                  Sube el avatar y el producto para empezar.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
            )}
          </div>

          <div className="lg:hidden" />

          {/* ── Resultados ── */}
          <div className="space-y-4">
            <PanelConocimiento conocimiento={conocimiento} onActualizar={setConocimiento} />

            {!job && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/[0.07] text-sm text-zinc-600">
                Los videos aparecerán acá.
              </div>
            )}

            {job && (
              <>
                <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0a0a0a] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {ESTADOS[job.estado] || job.estado}
                      {job.producto?.nombre ? ` · ${job.producto.nombre}` : ''}
                    </p>
                    <p className="text-[11px] text-zinc-500">{job.resumen || job.mensaje}</p>
                  </div>
                  {job.estado !== 'terminado' && job.estado !== 'error' && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  )}
                </div>

                {(job.tipo === 'largo' || (job.videoUrl && !job.variaciones?.length)) ? (
                  <div className="space-y-4">
                    {/* Arco narrativo del video: se conoce antes de gastar un solo credito. */}
                    {job.plan_shots?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.plan_shots.map((s) => {
                          const clip = (job.clips || []).find((c) => c.shot_id === s.shot_id);
                          const rehecho = clip?.fidelidad?.rehecho;
                          return (
                            <span
                              key={s.shot_id}
                              className={`rounded-md px-2 py-1 text-[10px] ${
                                rehecho
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : clip
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-white/[0.04] text-zinc-500'
                              }`}
                              title={
                                rehecho
                                  ? `Rehecho por fidelidad: ${(clip.fidelidad.fallos_previos || []).join('; ')}`
                                  : s.movimiento
                              }
                            >
                              {s.shot_id}. {s.rol}
                              {rehecho && ' ↻'}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Si la foto no daba para identificar el producto, se dice. */}
                    {job.necesita_contexto && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-semibold text-amber-300">
                          Este video se generó sin contexto claro del producto
                        </p>
                        <p className="mt-0.5 text-[10px] text-amber-200/70">
                          Escribe el contexto en el panel y vuelve a generar para que el guion hable
                          de tu producto real.
                        </p>
                      </div>
                    )}

                    {job.videoUrl ? (
                      <div className="max-w-[220px] overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0d0d]">
                        <video
                          src={job.videoUrl}
                          controls
                          playsInline
                          poster={job.portadaUrl || undefined}
                          className="aspect-[9/16] w-full bg-black object-cover"
                        />
                        <div className="space-y-2 p-3">
                          <a
                            href={job.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="inline-block rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-500"
                          >
                            Descargar
                          </a>
                          {job.costo_real != null && (
                            <p className="text-[10px] text-zinc-500">
                              Costo {job.costo_exacto === false ? '~' : ''}${job.costo_real}
                              {job.costo_creditos != null && ` · ${job.costo_creditos} créditos`}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/[0.07] text-sm text-zinc-600">
                        {job.mensaje || 'Generando video largo…'}
                      </div>
                    )}

                    {/* Texto del post, listo para copiar. */}
                    {job.caption && (
                      <div className="rounded-xl border border-white/[0.07] bg-[#0a0a0a] p-3">
                        <p className="text-[11px] leading-relaxed text-zinc-300">{job.caption}</p>
                        {job.hashtags?.length > 0 && (
                          <p className="mt-2 text-[10px] text-violet-300/80">
                            {job.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard?.writeText(
                              `${job.caption}\n\n${(job.hashtags || [])
                                .map((h) => (h.startsWith('#') ? h : `#${h}`))
                                .join(' ')}`
                            )
                          }
                          className="mt-2 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/[0.1]"
                        >
                          Copiar caption
                        </button>
                      </div>
                    )}

                    {job.error?.codigo && (
                      <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300">
                          {job.error.codigo}
                        </p>
                        <p className="mt-1 text-[11px] text-red-300/90">{job.error.mensaje}</p>
                        {job.error.sugerencia && (
                          <p className="mt-1 text-[10px] text-red-400/70">{job.error.sugerencia}</p>
                        )}
                        {job.error.taskId && (
                          <p className="mt-1 text-[9px] text-red-400/50">taskId: {job.error.taskId}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(job.variaciones || []).map((v) => (
                      <TarjetaVideo key={v.id} jobId={job.id} v={v} onVeredicto={marcar} />
                    ))}
                  </div>
                )}
                {job.aviso && (
                  <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                    ⏳ {job.aviso}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}