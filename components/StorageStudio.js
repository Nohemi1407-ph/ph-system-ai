'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Cada estudio guarda el historial con un nombre de array diferente
const STORAGE_SOURCES = [
  { key: 'hg_image_studio_persistent',     type: 'image',     label: 'Imagen',    historyKey: 'localHistory'    },
  { key: 'hg_video_studio_persistent',     type: 'video',     label: 'Video',     historyKey: 'localHistory'    },
  { key: 'hg_cinema_studio_persistent',    type: 'cinema',    label: 'Cinema',    historyKey: 'internalHistory' },
  { key: 'hg_lipsync_studio_persistent',   type: 'lipsync',   label: 'Lip Sync',  historyKey: 'internalHistory' },
  { key: 'hg_marketing_studio_persistent', type: 'marketing', label: 'Marketing', historyKey: 'history'         },
];

const TYPE_COLORS = {
  image:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  video:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cinema:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  lipsync:   'bg-pink-500/20 text-pink-300 border-pink-500/30',
  marketing: 'bg-green-500/20 text-green-300 border-green-500/30',
};

// Cinema guarda prompt dentro de settings.prompt — normalizar al cargar
function normalizeEntry(entry, source) {
  const prompt = entry.prompt ?? entry.settings?.prompt ?? '';
  // Cinema no genera id — usar URL como identificador estable
  const id = entry.id ?? entry.url;
  return {
    ...entry,
    id,
    prompt,
    type: source.type,
    label: source.label,
    storageKey: source.key,
    historyKey: source.historyKey,
  };
}

function loadAllItems() {
  const all = [];
  for (const source of STORAGE_SOURCES) {
    try {
      const raw = localStorage.getItem(source.key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const history = data[source.historyKey] || [];
      history.forEach((entry) => {
        if (entry?.url) all.push(normalizeEntry(entry, source));
      });
    } catch {}
  }
  return all.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

function removeItem(storageKey, id, historyKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    const key = historyKey || 'localHistory';
    // Cinema usa url como id — intentar ambos
    data[key] = (data[key] || []).filter((e) => e.id !== id && e.url !== id);
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {}
}

async function downloadItem(url, filename) {
  try {
    // Proxy servidor para evitar CORS en URLs de CDN
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('proxy error');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

// Thumbnail de video que avanza al primer fotograma al cargar metadatos
function VideoThumb({ src, className }) {
  const ref = useRef(null);
  return (
    <video
      ref={ref}
      src={src}
      className={className}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={() => {
        if (ref.current) ref.current.currentTime = 0.5;
      }}
    />
  );
}

// ── Constantes filtros ────────────────────────────────────────────────────────

const FILTERS = ['Todos', 'image', 'video', 'cinema', 'lipsync', 'marketing'];
const FILTER_LABELS = {
  Todos: 'Todos', image: 'Imágenes', video: 'Videos',
  cinema: 'Cinema', lipsync: 'Lip Sync', marketing: 'Marketing',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function StorageStudio() {
  const [items, setItems]           = useState([]);
  const [filter, setFilter]         = useState('Todos');
  const [downloading, setDownloading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const refresh = useCallback(() => setItems(loadAllItems()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const isVideo = (item) => item.type !== 'image';

  const filtered = filter === 'Todos' ? items : items.filter((i) => i.type === filter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'Todos' ? items.length : items.filter((i) => i.type === f).length;
    return acc;
  }, {});

  const handleDownload = async (item) => {
    const key = item.id ?? item.url;
    setDownloading((p) => ({ ...p, [key]: true }));
    const ext = item.type === 'image' ? 'jpg' : 'mp4';
    await downloadItem(item.url, `phsystem-${item.type}-${Date.now()}.${ext}`);
    setDownloading((p) => ({ ...p, [key]: false }));
  };

  const confirmDeleteAction = () => {
    if (!confirmDelete) return;
    removeItem(confirmDelete.storageKey, confirmDelete.id, confirmDelete.historyKey);
    setConfirmDelete(null);
    refresh();
  };

  const itemKey = (item) => item.id ?? item.url;

  return (
    <div className="h-full flex flex-col bg-[#030303] text-white overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Mis Archivos</h2>
          <p className="text-xs text-white/40 mt-0.5">{items.length} archivos generados · guardados localmente</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
        >
          <RefreshIcon /> Actualizar
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-2 flex-wrap border-b border-white/[0.04]">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filter === f
                ? 'bg-[#8b00ff]/15 text-[#8b00ff] border-[#8b00ff]/30'
                : 'bg-white/5 text-white/50 border-white/[0.06] hover:text-white hover:bg-white/10'
            }`}
          >
            {FILTER_LABELS[f]}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-[#8b00ff]/20 text-[#8b00ff]' : 'bg-white/10 text-white/40'}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-sm">No hay archivos en esta categoría</p>
            <p className="text-xs">Genera contenido en los estudios y aparecerá aquí automáticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((item) => (
              <div
                key={itemKey(item)}
                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square cursor-pointer overflow-hidden bg-black/40 relative"
                  onClick={() => setPreviewItem(item)}
                >
                  {isVideo(item) ? (
                    <VideoThumb src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.prompt || 'Imagen generada'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* Overlay play (video) */}
                  {isVideo(item) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center pl-0.5">
                        <PlayIcon />
                      </div>
                    </div>
                  )}

                  {/* Badge tipo */}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${TYPE_COLORS[item.type]}`}>
                    {item.label}
                  </span>
                </div>

                {/* Info + acciones */}
                <div className="p-2.5">
                  {item.prompt && (
                    <p className="text-[11px] text-white/60 leading-snug line-clamp-2 mb-1.5">
                      {item.prompt}
                    </p>
                  )}
                  <p className="text-[10px] text-white/25 mb-2">{formatDate(item.timestamp)}</p>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={!!downloading[itemKey(item)]}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[#8b00ff]/10 text-[#8b00ff] hover:bg-[#8b00ff]/20 text-[11px] font-semibold transition-colors disabled:opacity-50"
                    >
                      {downloading[itemKey(item)] ? (
                        <span className="animate-spin text-xs">◌</span>
                      ) : (
                        <DownloadIcon />
                      )}
                      Bajar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="p-1.5 rounded-md bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal preview ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media */}
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
              {isVideo(previewItem) ? (
                <video
                  key={previewItem.url}
                  src={previewItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[65vh] object-contain"
                  style={{ outline: 'none' }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewItem.url}
                  alt=""
                  className="max-w-full max-h-[65vh] object-contain"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/[0.06] flex gap-4 items-start flex-wrap">
              <div className="flex-1 min-w-0">
                {previewItem.prompt && (
                  <p className="text-sm text-white/70 leading-relaxed mb-2">{previewItem.prompt}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-white/30 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${TYPE_COLORS[previewItem.type]}`}>
                    {previewItem.label}
                  </span>
                  {previewItem.model && <span>{previewItem.model}</span>}
                  {previewItem.aspect_ratio && <span>{previewItem.aspect_ratio}</span>}
                  <span>{formatDate(previewItem.timestamp)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(previewItem)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b00ff] text-white text-xs font-bold hover:bg-[#a020f0] transition-colors"
                >
                  <DownloadIcon /> Descargar
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar borrado ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Eliminar archivo</h3>
            <p className="text-white/50 text-sm mb-6">
              Este archivo se eliminará del historial local. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteAction}
                className="flex-1 h-10 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-sm font-semibold transition-colors border border-red-500/20"
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 text-sm font-semibold transition-colors border border-white/[0.06]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
