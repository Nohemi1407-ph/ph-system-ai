/**
 * PH TikTok Shop Engine — ALMACEN
 * -----------------------------------------------------------------------------
 * Guarda jobs, videos y feedback en un archivo JSON en disco.
 *
 * IMPORTANTE: cada funcion LEE el archivo fresco de disco antes de operar,
 * en vez de confiar en una copia en memoria. Esto es a proposito: en modo
 * desarrollo, Next.js puede recompilar distintas rutas API por separado,
 * y cada una puede terminar con su propia instancia de este modulo. Si
 * confiaramos en memoria, una ruta podria "no ver" lo que otra escribio
 * (el bug de "Job no encontrado"). Leer siempre de disco evita eso.
 *
 * Mañana: se cambia SOLO este archivo por Supabase y nada mas se rompe.
 */

import fs from 'fs';
import path from 'path';

const DIR = process.env.PH_DATA_DIR || path.join(process.cwd(), '.data');
const ARCHIVO = path.join(DIR, 'tiktok-jobs.json');

let respaldo = { jobs: {}, feedback: {} };

function leer() {
  try {
    if (fs.existsSync(ARCHIVO)) {
      const data = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
      respaldo = { jobs: {}, feedback: {}, ...data };
      return respaldo;
    }
  } catch (e) {
    console.warn('[PH TikTok] No se pudo leer el store, uso el respaldo en memoria:', e.message);
  }
  return respaldo;
}

function escribir(data) {
  respaldo = data;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(ARCHIVO, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[PH TikTok] No se pudo escribir el store (queda solo en memoria):', e.message);
  }
}

export function crearJob(job) {
  const data = leer();
  data.jobs[job.id] = { ...job, creado: Date.now(), actualizado: Date.now() };
  escribir(data);
  return data.jobs[job.id];
}

export function getJob(id) {
  return leer().jobs[id] || null;
}

export function actualizarJob(id, parche) {
  const data = leer();
  const actual = data.jobs[id];
  if (!actual) return null;
  data.jobs[id] = { ...actual, ...parche, actualizado: Date.now() };
  escribir(data);
  return data.jobs[id];
}

export function actualizarVariacion(jobId, variacionId, parche) {
  const data = leer();
  const job = data.jobs[jobId];
  if (!job) return null;
  job.variaciones = (job.variaciones || []).map((v) =>
    v.id === variacionId ? { ...v, ...parche } : v
  );
  job.actualizado = Date.now();
  data.jobs[jobId] = job;
  escribir(data);
  return job;
}

export function listarJobs({ limite = 30 } = {}) {
  const data = leer();
  return Object.values(data.jobs)
    .sort((a, b) => b.creado - a.creado)
    .slice(0, limite)
    .map(({ id, estado, producto, motor, creado, variaciones = [] }) => ({
      id,
      estado,
      producto: producto?.nombre,
      motor,
      creado,
      total: variaciones.length,
      listos: variaciones.filter((v) => v.estado === 'listo').length,
    }));
}

export function registrarFeedback(f) {
  const data = leer();
  const key = `${f.jobId}:${f.variacionId}`;
  data.feedback[key] = { ...f, registrado: Date.now() };
  escribir(data);
  actualizarVariacion(f.jobId, f.variacionId, { veredicto: f.veredicto, metricas: f });
  return data.feedback[key];
}

export function getGanadores({ limite = 3 } = {}) {
  const data = leer();
  const ganadores = Object.values(data.feedback)
    .filter((f) => f.veredicto === 'ganador')
    .sort((a, b) => (b.ventas || 0) - (a.ventas || 0) || (b.vistas || 0) - (a.vistas || 0))
    .slice(0, limite);

  return ganadores.map((f) => {
    const job = data.jobs[f.jobId];
    const v = job?.variaciones?.find((x) => x.id === f.variacionId);
    return {
      id: f.variacionId,
      estrategia: v?.plan?.estrategia,
      familia_hook: v?.plan?.familia_hook,
      hook: v?.guion?.hook,
      que_funciono: f.que_funciono || 'métricas superiores al resto del lote',
      metricas: { vistas: f.vistas, ventas: f.ventas, retencion: f.retencion },
    };
  });
}

export function tableroDesempeno() {
  const data = leer();
  const filas = Object.values(data.feedback).map((f) => {
    const job = data.jobs[f.jobId];
    const v = job?.variaciones?.find((x) => x.id === f.variacionId);
    return {
      familia_hook: v?.plan?.familia_hook || '—',
      estrategia: v?.plan?.estrategia || '—',
      angulo: v?.plan?.angulo_venta || '—',
      veredicto: f.veredicto,
      ventas: f.ventas || 0,
      vistas: f.vistas || 0,
    };
  });

  const agrupar = (campo) => {
    const acc = {};
    for (const f of filas) {
      acc[f[campo]] ||= { clave: f[campo], videos: 0, ganadores: 0, ventas: 0 };
      acc[f[campo]].videos++;
      if (f.veredicto === 'ganador') acc[f[campo]].ganadores++;
      acc[f[campo]].ventas += f.ventas;
    }
    return Object.values(acc).sort((a, b) => b.ventas - a.ventas);
  };

  return {
    total: filas.length,
    por_hook: agrupar('familia_hook'),
    por_estrategia: agrupar('estrategia'),
    por_angulo: agrupar('angulo'),
  };
}