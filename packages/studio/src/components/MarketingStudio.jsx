"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { uploadFile, generateMarketingStudioAd } from "../muapi.js";

const SCROLLBAR_STYLE = `
  .custom-scrollbar-thin::-webkit-scrollbar {
    height: 4px;
  }
  .custom-scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(34, 211, 238, 0.3);
  }
`;

// ── Icons ────────────────────────────────────────────────────────────────────

const CheckSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b00ff" strokeWidth="4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CloseSvg = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ProductIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 8l-2-2H5L3 8v10a2 2 0 002 2h14a2 2 0 002-2V8z" />
    <path d="M3 10h18" />
    <path d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const AvatarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const RefIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ── Assets ───────────────────────────────────────────────────────────────────

const ASSETS = {
  avatar: [
    { id: "aa252283-8591-4d14-91a8-41ce54187992", name: "Priya", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Priya.webp" },
    { id: "ba6c9b18-f79c-4dab-9649-88a181d0a038", name: "Elena", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Elena.webp" },
    { id: "30e2cadd-987c-4a7a-81c3-094d4fb3a65e", name: "Kai", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Kai.webp" },
    { id: "fbed59e1-4b8d-4625-9140-ef2044e0be72", name: "Sora", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Sora.webp" },
    { id: "bcd9e6ee-c000-48e6-9f4b-a20fc2a674f7", name: "Minji", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Minji.webp" },
    { id: "1da384ed-3856-45e4-bf4c-a496c7aa95ff", name: "Margot", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Margot.webp" },
    { id: "b799c8f5-fb6e-4905-b33b-cdefac153ec3", name: "Niko", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Niko.webp" },
    { id: "b6971dd4-55fa-4e64-b318-392b16504284", name: "Jin", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/Jin.webp" }
  ],
  ugc: [
    { id: 1, name: "UGC", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/ugc.mp4" },
    { id: 2, name: "Tutorial", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/ugc_how_to.mp4" },
    { id: 3, name: "Unboxing", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/ugc_unboxing.mp4" },
    { id: 4, name: "Hyper Motion", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/hyper-motion-mini.mp4" },
    { id: 5, name: "Product Review", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/product_review.mp4" },
    { id: 6, name: "TV Spot", url: "https://d3adwkbyhxyrtq.cloudfront.net/web-app/tv-spot-mini.mp4" }
  ]
};

const OPTIONS = {
  ratio: ["9:16", "3:4", "4:3", "16:9", "1:1"],
  res: ["720p", "1080p"],
  duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
};

// ── Components ───────────────────────────────────────────────────────────────

function UploadSlot({ icon, url, progress, label, onUpload, onClear, multiple = false, images = [] }) {
  const inputRef = useRef(null);
  
  return (
    <div className="relative group/slot flex items-center">
      <div 
        onClick={() => inputRef.current?.click()}
        title={`Upload ${label}`}
        className={`relative w-10 h-10 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
          url ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        <input 
          ref={inputRef} 
          type="file" 
          accept="image/*"
          className="hidden" 
          multiple={multiple}
          onChange={(e) => onUpload(e)} 
        />
        
        {progress > 0 && progress < 100 ? (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-10">
            <span className="text-[8px] font-black text-primary">{progress}%</span>
          </div>
        ) : url ? (
          <div className="w-full h-full rounded-full overflow-hidden border border-black/20">
            <img src={url} className="w-full h-full object-cover" alt={label} />
          </div>
        ) : (
          <div className="text-white/40 group-hover:text-primary transition-colors">
            {icon}
          </div>
        )}

        {/* Clear Button (Single) */}
        {url && !multiple && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity shadow-lg"
          >
            <CloseSvg />
          </button>
        )}
      </div>      
    </div>
  );
}

function Dropdown({ isOpen, title, items, selectedId, onSelect, onClose, isVideo = false }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={ref}
      className="absolute bottom-[calc(100%+12px)] left-0 z-50 bg-[#0a0a0a] rounded p-4 shadow-4xl border border-white/10 w-[420px] animate-fade-in-up"
    >
      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 px-1">{title}</div>
      <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {items.map(item => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className={`relative rounded overflow-hidden border-2 transition-all group cursor-pointer ${
              selectedId === item.id || selectedId === item.url ? 'border-primary shadow-glow' : 'border-white/5 hover:border-white/20'
            }`}
          >
            {isVideo ? (
              <video src={item.url} autoPlay loop muted className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-all duration-500" />
            ) : (
              <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-all duration-500" alt={item.name} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-black text-white uppercase tracking-tight">{item.name}</span>
            </div>
            {(selectedId === item.id || selectedId === item.url) && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <CheckSvg />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleDropdown({ isOpen, title, options, selected, onSelect, onClose }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={ref}
      className="absolute bottom-[calc(100%+12px)] left-0 z-50 bg-[#0a0a0a] rounded p-1 max-h-[200px] overflow-y-auto custom-scrollbar shadow-3xl border border-white/10 min-w-[140px] animate-fade-in-up"
    >
      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 px-3 pt-2">{title}</div>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { onSelect(opt); onClose(); }}
          className={`w-full text-left px-4 py-2 rounded text-xs font-bold transition-all flex items-center justify-between ${
            selected === opt ? 'bg-primary text-black' : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span>{opt}</span>
          {selected === opt && <CheckSvg />}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MarketingStudio({ apiKey, droppedFiles, onFilesHandled }) {
  const PERSIST_KEY = "hg_marketing_studio_persistent";
  
  const [prompt, setPrompt] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [avatarImage, setAvatarImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  
  const [params, setParams] = useState({
    ratio: "9:16",
    format: ASSETS.ugc[0].name,
    videoUrl: ASSETS.ugc[0].url,
    res: "1080p",
    duration: 5
  });

  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dropdown, setDropdown] = useState(null); // 'format' | 'avatar' | 'ratio' | 'res' | 'duration'
  const [uploadProgress, setUploadProgress] = useState({ product: 0, avatar: 0, additional: 0 });
  const [fullscreenUrl, setFullscreenUrl] = useState(null);
  const [videoErrors, setVideoErrors] = useState({});

  const textareaRef = useRef(null);

  // ── Persistence ───────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSIST_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.prompt) setPrompt(data.prompt);
        if (data.params) setParams(data.params);
        if (data.productImage) setProductImage(data.productImage);
        if (data.avatarImage) setAvatarImage(data.avatarImage);
        if (data.additionalImages) setAdditionalImages(data.additionalImages);
        if (data.history) setHistory(data.history);
      }
    } catch (err) { console.warn("Load failed", err); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const state = { prompt, params, productImage, avatarImage, additionalImages, history };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
    }, 500);
    return () => clearTimeout(timer);
  }, [prompt, params, productImage, avatarImage, additionalImages, history]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const downloadFile = async (url, filename) => {
    try {
      // Proxy del servidor para evitar CORS en URLs de CDN
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("proxy error");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleUpload = async (e, target) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (target === 'additional') {
      const remaining = 6 - additionalImages.length;
      const toUpload = files.slice(0, remaining);
      for (const file of toUpload) {
        try {
          const url = await uploadFile(apiKey, file, (pct) => setUploadProgress(p => ({ ...p, additional: pct })));
          setAdditionalImages(prev => [...prev, url].slice(0, 6));
        } catch (err) { alert(err.message); }
      }
    } else {
      const file = files[0];
      try {
        const url = await uploadFile(apiKey, file, (pct) => setUploadProgress(p => ({ ...p, [target]: pct })));
        if (target === 'product') setProductImage(url);
        else setAvatarImage(url);
      } catch (err) { alert(err.message); }
    }
    setUploadProgress(p => ({ ...p, [target]: 0 }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return alert("Please enter an ad script.");
    if (!productImage) return alert("Please upload a product image.");

    setIsGenerating(true);
    try {
      const result = await generateMarketingStudioAd(apiKey, {
        prompt,
        aspect_ratio: params.ratio,
        duration: params.duration,
        resolution: params.res,
        images_list: [productImage, avatarImage, ...additionalImages].filter(Boolean),
        video_files: params.videoUrl ? [params.videoUrl] : []
      });

      if (result?.url) {
        const entry = {
          id: Date.now(),
          url: result.url,
          prompt,
          format: params.format,
          timestamp: new Date().toISOString()
        };
        setHistory(prev => [entry, ...prev]);
        setFullscreenUrl(result.url);
      }
    } catch (err) {
      alert("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 250) + "px";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-app-bg relative p-4 md:p-6 overflow-hidden">
      <style>{SCROLLBAR_STYLE}</style>
      
      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-40">
        {history.length > 0 ? (
          <div className="flex flex-col gap-8 animate-fade-in-up">

            {/* ── Video destacado (el más reciente) ── */}
            <div className="w-full max-w-2xl mx-auto">
              <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-black shadow-2xl">

                {/* Video o estado de error */}
                {videoErrors[history[0].url] ? (
                  /* El URL expiró o no carga — mostrar opciones */
                  <div className="aspect-video flex flex-col items-center justify-center bg-[#0a0a0a] gap-4 p-6">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b00ff" strokeWidth="1.5" opacity="0.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-white/40 text-sm text-center">El enlace del video expiró.</p>
                    <a
                      href={history[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Intentar abrir directamente
                    </a>
                  </div>
                ) : (
                  <video
                    key={history[0].url}
                    src={history[0].url}
                    className="w-full aspect-video object-contain bg-black"
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    onError={() => setVideoErrors(p => ({ ...p, [history[0].url]: true }))}
                  />
                )}

                {/* Badge "Más reciente" */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-primary/90 rounded-full text-[10px] font-black text-black tracking-wider uppercase shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  Último generado
                </div>

                {/* Botones acción */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <a
                    href={history[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg text-white text-[11px] font-bold border border-white/10 hover:bg-white/20 transition-all"
                    title="Abrir en nueva pestaña"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Ver
                  </a>
                  <button
                    onClick={() => downloadFile(history[0].url, `marketing-ad-${history[0].id}.mp4`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/90 backdrop-blur-md rounded-lg text-black text-[11px] font-bold hover:bg-primary transition-all"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Descargar
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 bg-black/80 border-t border-white/5">
                  {history[0].prompt && (
                    <p className="text-white/60 text-xs line-clamp-2 mb-1">{history[0].prompt}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {history[0].format && (
                      <span className="text-[9px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 uppercase tracking-tighter">
                        {history[0].format}
                      </span>
                    )}
                    <span className="text-[9px] text-white/30">{new Date(history[0].timestamp).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Historial de generaciones anteriores ── */}
            {history.length > 1 && (
              <div>
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3 px-1">Anteriores</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {history.slice(1).map(entry => (
                    <div
                      key={entry.id}
                      className="relative group rounded-lg overflow-hidden border border-white/[0.07] bg-[#0a0a0a] hover:border-primary/40 transition-all duration-200 cursor-pointer"
                      onClick={() => setFullscreenUrl(entry.url)}
                    >
                      {/* Thumbnail con frame visible */}
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <video
                          src={entry.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedMetadata={e => { e.target.currentTime = 0.5; }}
                          onMouseOver={e => e.target.play()}
                          onMouseOut={e => { e.target.pause(); e.target.currentTime = 0.5; }}
                        />
                        {/* Play overlay siempre visible */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center pl-0.5 border border-white/20 group-hover:scale-110 group-hover:bg-primary/80 transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                        </div>
                        {/* Botón descargar al hover */}
                        <button
                          onClick={e => { e.stopPropagation(); downloadFile(entry.url, `marketing-ad-${entry.id}.mp4`); }}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary border border-white/10"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                          </svg>
                        </button>
                      </div>
                      <div className="p-2 border-t border-white/5">
                        <p className="text-white/40 text-[10px] line-clamp-1">{entry.prompt}</p>
                        <span className="text-[9px] text-white/20">{new Date(entry.timestamp).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in-up transition-all duration-700">
             <div className="mb-12 relative group">
                <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000" />
                <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white/[0.02] rounded-[2rem] flex items-center justify-center border border-white/[0.05] overflow-hidden backdrop-blur-sm">
                  <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 relative z-10 transition-transform duration-500 group-hover:scale-110 shadow-inner">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b00ff" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                </div>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4 text-center px-4">
                <span className="text-white/40 font-medium uppercase tracking-widest">START CREATING WITH</span>
                <br />
                <span className="text-white uppercase tracking-tight">MARKETING STUDIO</span>
              </h1>
              <p className="text-white/40 text-sm md:text-base font-medium tracking-wide text-center max-w-lg leading-relaxed px-6">
                Describe your scene, upload your product, and watch high-converting AI video ads come to life.
              </p>
          </div>
        )}
      </div>

      {/* ── BOTTOM PROMPT BAR ── */}
      <div style={{ animationDelay: "0.2s" }} className="absolute bottom-4 w-full max-w-[95%] lg:max-w-4xl z-40 animate-fade-in-up">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-lg border border-white/10 p-4 flex flex-col gap-2 shadow-4xl">
          {additionalImages.length > 0 && (
            <div className="flex items-center gap-1.5">
              {additionalImages.map((img, idx) => (
                <div key={idx} className="relative group/img flex-shrink-0">
                  <img src={img} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                  <button 
                    onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity border border-white/10"
                  >
                    <CloseSvg />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Top Row: Full-width Textarea */}
          <div className="w-full relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onInput={handleTextareaInput}
              placeholder="Describe your ad script... Use @image1 for product, @image2 for avatar."
              rows={1}
              className="w-full bg-transparent border-none text-white text-sm placeholder:text-white/20 focus:outline-none resize-none pt-1 leading-relaxed min-h-[44px] max-h-[300px] custom-scrollbar font-medium"
            />
          </div>

          {/* Bottom Row: Uploads + Controls + Generate */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Asset Uploads Group */}
              <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
                <UploadSlot 
                  label="Product" 
                  icon={<ProductIcon />} 
                  url={productImage} 
                  progress={uploadProgress.product} 
                  onUpload={(e) => handleUpload(e, 'product')} 
                  onClear={() => setProductImage(null)} 
                />
                <UploadSlot 
                  label="Avatar" 
                  icon={<AvatarIcon />} 
                  url={avatarImage} 
                  progress={uploadProgress.avatar} 
                  onUpload={(e) => handleUpload(e, 'avatar')} 
                  onClear={() => setAvatarImage(null)} 
                />
                <UploadSlot 
                  label="References" 
                  icon={<RefIcon />} 
                  url={additionalImages[0]} 
                  progress={uploadProgress.additional} 
                  multiple 
                  images={additionalImages}
                  onUpload={(e) => handleUpload(e, 'additional')} 
                  onClear={(idx) => {
                    if (idx !== undefined) {
                      setAdditionalImages(prev => prev.filter((_, i) => i !== idx));
                    } else {
                      setAdditionalImages([]);
                    }
                  }} 
                />
              </div>

              {/* Format Button */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === 'format' ? null : 'format'); }}
                  className={`flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.08] rounded border transition-all group whitespace-nowrap ${dropdown === 'format' ? 'border-primary/50' : 'border-white/5'}`}
                >
                  <div className="w-4 h-4 bg-primary/10 rounded flex items-center justify-center border border-primary/20">
                    <span className="text-[8px] font-black text-primary uppercase">U</span>
                  </div>
                  <span className="text-sm font-bold text-white/70 group-hover:text-primary transition-colors">{params.format}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-20 group-hover:opacity-100 transition-opacity"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <Dropdown 
                  isOpen={dropdown === 'format'} 
                  title="Video Format Presets"
                  items={ASSETS.ugc} 
                  selectedId={params.format}
                  onSelect={(item) => setParams({ ...params, format: item.name, videoUrl: item.url })}
                  onClose={() => setDropdown(null)}
                  isVideo
                />
              </div>

              {/* Avatar Preset Button */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === 'avatar' ? null : 'avatar'); }}
                  className={`flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.08] rounded border transition-all group whitespace-nowrap ${dropdown === 'avatar' ? 'border-primary/50' : 'border-white/5'}`}
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20 shadow-inner">
                    <img src={avatarImage || ASSETS.avatar[0].url} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold text-white/70 group-hover:text-primary transition-colors">
                    {ASSETS.avatar.find(a => a.url === avatarImage)?.name || "Select Avatar"}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-20 group-hover:opacity-100 transition-opacity"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <Dropdown 
                  isOpen={dropdown === 'avatar'} 
                  title="Avatar Presets"
                  items={ASSETS.avatar} 
                  selectedId={avatarImage}
                  onSelect={(item) => setAvatarImage(item.url)}
                  onClose={() => setDropdown(null)}
                />
              </div>

              {/* Simple Controls */}
              {['ratio', 'res', 'duration'].map(key => (
                <div key={key} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDropdown(dropdown === key ? null : key); }}
                    className={`px-3 py-2 bg-white/[0.03] hover:bg-white/[0.08] rounded border transition-all text-sm font-bold ${dropdown === key ? 'border-primary/50 text-primary' : 'border-white/5 text-white/70'}`}
                  >
                    {key === 'duration' ? `${params[key]}s` : params[key]}
                  </button>
                  <SimpleDropdown 
                    isOpen={dropdown === key} 
                    title={key === 'res' ? 'Resolution' : key.toUpperCase()} 
                    options={OPTIONS[key]} 
                    selected={params[key]} 
                    onSelect={(val) => setParams({ ...params, [key]: val })} 
                    onClose={() => setDropdown(null)} 
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-primary text-black px-8 py-2.5 rounded font-bold text-base hover:bg-[#e5ff33] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-glow disabled:opacity-50 disabled:grayscale z-10"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <span>Launch</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
          onClick={() => setFullscreenUrl(null)}
        >
          {/* Barra superior */}
          <div
            className="w-full flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-white/50 text-sm font-semibold">Vista previa</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadFile(fullscreenUrl, `marketing-ad-${Date.now()}.mp4`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-black text-xs font-bold hover:bg-primary/80 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Descargar
              </button>
              <button
                onClick={() => setFullscreenUrl(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white border border-white/10 transition-colors"
              >
                <CloseSvg />
              </button>
            </div>
          </div>
          {/* Video */}
          <div className="flex-1 flex items-center justify-center p-6 w-full min-h-0" onClick={e => e.stopPropagation()}>
            <video
              key={fullscreenUrl}
              src={fullscreenUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-xl shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
