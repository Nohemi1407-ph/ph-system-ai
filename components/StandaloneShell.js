'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, MarketingStudio, WorkflowStudio, AgentStudio, AppsStudio, getUserBalance } from 'studio';
import axios from 'axios';
import ApiKeyModal from './ApiKeyModal';
import StorageStudio from './StorageStudio';
import TikTokShopClient from '@/app/tiktok/TikTokShopClient';

const TABS = [
  { id: 'tiktok',  label: 'TikTok Shop' },
  { id: 'image',   label: 'Image Studio' },
  { id: 'video',   label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema',  label: 'Cinema Studio' },
  { id: 'marketing', label: 'Marketing Studio' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'agents', label: 'Agents' },
  { id: 'apps', label: 'Explore Apps' },
  { id: 'storage', label: 'Mis Archivos' },
];

const STORAGE_KEY = 'muapi_key';

export default function StandaloneShell() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || []; 
  const idFromParams = params?.id;
  const tabFromParams = params?.tab;

  // Helper to extract workflow details precisely from either route structure
  const getWorkflowInfo = useCallback(() => {
    if (idFromParams) {
        return { id: idFromParams, tab: tabFromParams || null };
    }
    const wfIndex = slug.findIndex(s => s === 'workflows' || s === 'workflow');
    if (wfIndex === -1) return { id: null, tab: null };
    return {
      id: slug[wfIndex + 1] || null,
      tab: slug[wfIndex + 2] || null
    };
  }, [slug, idFromParams, tabFromParams]);

  const { id: urlWorkflowId } = getWorkflowInfo();

  // Initialize activeTab from URL slug/params or default to 'image'
  const getInitialTab = () => {
    if (idFromParams || slug.includes('workflow')) return 'workflows';
    if (slug.includes('agents')) return 'agents';
    if (slug.includes('apps')) return 'apps';
    const firstSegment = slug[0];
    if (firstSegment && TABS.find(t => t.id === firstSegment)) return firstSegment;
    return 'image';
  };
  
  const [apiKey, setApiKey] = useState(null);
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
  const [balance, setBalance] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);

  // Sync tab with URL if user navigates manually or via browser back/forward
  useEffect(() => {
    const info = getWorkflowInfo();
    if (info.id) {
        setActiveTab('workflows');
    } else if (slug.includes('agents')) {
        setActiveTab('agents');
    } else if (slug.includes('apps')) {
        setActiveTab('apps');
    } else {
        const firstSegment = slug[0];
        if (firstSegment && TABS.find(t => t.id === firstSegment)) {
          setActiveTab(firstSegment);
        }
    }
  }, [slug, getWorkflowInfo]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push(`/studio/${tabId}`);
  };

  // Auto-hide header when inside a specific workflow view
  useEffect(() => {
    const isEditingWorkflow = (activeTab === 'workflows' || !!idFromParams) && urlWorkflowId;
    if (isEditingWorkflow) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  }, [activeTab, urlWorkflowId, idFromParams]);

  // Global builder CSS cleanup when switching away from Workflows tab
  useEffect(() => {
    const fromBuilder = sessionStorage.getItem("fromWorkflowBuilder");
    if (fromBuilder && activeTab !== 'workflows') {
      sessionStorage.removeItem("fromWorkflowBuilder");
      window.location.reload();
    }
  }, [activeTab]);

  const fetchBalance = useCallback(async (key, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await getUserBalance(key);
        setBalance(data.balance ?? data.credits ?? null);
        return;
      } catch (err) {
        const is404 = err?.message?.includes('404');
        if (is404 && i < retries - 1) {
          // Ruta aún compilando en dev mode — esperar y reintentar
          await new Promise(r => setTimeout(r, delay));
        } else if (!is404) {
          // Error real (sin créditos, key inválida) — no reintentar
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) || 'ph-system-internal';
    localStorage.setItem(STORAGE_KEY, stored);
    setApiKey(stored);
    fetchBalance(stored);
    document.cookie = `muapi_key=${stored}; path=/; max-age=31536000; SameSite=Lax`;
  }, [fetchBalance]);

  const handleKeySave = useCallback((key) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    fetchBalance(key);
    document.cookie = `muapi_key=${key}; path=/; max-age=31536000; SameSite=Lax`;
  }, [fetchBalance]);

  const handleKeyChange = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setBalance(null);
    document.cookie = "muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  // Inject API key into all outgoing Axios requests (prop-based approach)
  // We use an interceptor to be selective and NOT send the key to external domains like S3
  useEffect(() => {
    // Safety: Clear any global defaults that might have been set previously
    delete axios.defaults.headers.common['x-api-key'];

    if (!apiKey) return;

    const interceptorId = axios.interceptors.request.use((config) => {
      // Check if URL is local/proxied
      const isRelative = config.url.startsWith('/') || !config.url.startsWith('http');
      const isInternalProxy = config.url.includes('/api/app') || config.url.includes('/api/workflow') || config.url.includes('/api/agents') || config.url.includes('/api/api') || config.url.includes('/api/v1');

      if (isRelative || isInternalProxy) {
        config.headers['x-api-key'] = apiKey;
      }
      
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, [apiKey]);

  // Poll for balance every 30 seconds if key is present
  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(() => fetchBalance(apiKey), 30000);
    return () => clearInterval(interval);
  }, [apiKey, fetchBalance]);

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container itself, not moving between children
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setDroppedFiles(files);
    }
  }, []);

  const handleFilesHandled = useCallback(() => {
    setDroppedFiles(null);
  }, []);

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin text-[#8b00ff] text-3xl">◌</div>
    </div>
  );

  if (!apiKey) {
    return <ApiKeyModal onSave={handleKeySave} />;
  }

  return (
    <div
      className="h-screen bg-[#050505] flex flex-col overflow-hidden text-white relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ambient glow — futuristic atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[#8b00ff]/60 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-32 bg-[#8b00ff]/5 blur-3xl rounded-full" />
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-[#8b00ff]/10 backdrop-blur-md border-4 border-dashed border-[#8b00ff]/50 flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-[#8b00ff]/20 shadow-2xl flex flex-col items-center gap-4 scale-110 animate-pulse">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#fff,#8b00ff)'}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">Suelta tu archivo aquí</span>
              <span className="text-sm text-white/40">Imágenes, videos o audio</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {isHeaderVisible && (
        <header className="relative flex-shrink-0 h-14 border-b border-[#8b00ff]/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-40">
          {/* Top border glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8b00ff]/40 to-transparent" />

          {/* Left: Logo */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {/* Isotipo SVG — PH System AI */}
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="phGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#8b00ff"/>
                </linearGradient>
              </defs>
              {/* Outer rounded square */}
              <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#phGrad)"/>
              {/* Inner black to create letter shape */}
              <rect x="16" y="16" width="68" height="68" rx="14" fill="#050505"/>
              {/* Top arc / P shape */}
              <path d="M28 28 h22 a14 14 0 0 1 0 28 h-22 z" fill="url(#phGrad)"/>
              {/* Bottom bar */}
              <rect x="28" y="62" width="44" height="10" rx="5" fill="url(#phGrad)"/>
              {/* Right vertical accent */}
              <rect x="66" y="56" width="10" height="16" rx="4" fill="#8b00ff"/>
            </svg>

            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[13px] font-black tracking-widest text-white uppercase">PH System</span>
              <span className="text-[10px] font-bold tracking-[0.2em] bg-gradient-to-r from-white to-[#8b00ff] bg-clip-text text-transparent uppercase">AI</span>
            </div>
          </div>

          {/* Center: Navigation
              Ocupa el hueco entre logo y acciones en vez de ir centrada en
              absoluto: con 10 pestañas, el centrado absoluto se montaba encima
              del logo y de Settings. Si no caben, la barra scrollea. */}
          <nav className="mx-4 flex min-w-0 flex-1 items-center justify-center gap-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative py-4 text-[13px] font-medium transition-all whitespace-nowrap px-1 ${
                  activeTab === tab.id
                    ? 'text-[#8b00ff]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{background:'linear-gradient(90deg,#fff,#8b00ff)'}} />
                )}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 bg-[#8b00ff]/10 px-3 py-1.5 rounded-full border border-[#8b00ff]/20 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b00ff] animate-pulse shadow-[0_0_6px_#8b00ff]" />
              <span className="text-xs font-bold text-white/90">
                ${balance !== null ? `${balance}` : '---'}
              </span>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              title="Configuración"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#8b00ff]/20 bg-[#8b00ff]/5 text-[13px] font-bold text-white/70 hover:text-white hover:bg-[#8b00ff]/15 hover:border-[#8b00ff]/40 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </header>
      )}

      {/* Studio Content */}
      <div className="flex-1 min-h-0 relative overflow-hidden z-10">
        {activeTab === 'tiktok'  && <TikTokShopClient embebido />}
        {activeTab === 'image'   && <ImageStudio   apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={apiKey} />}
        {activeTab === 'marketing' && <MarketingStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'workflows' && <WorkflowStudio apiKey={apiKey} isHeaderVisible={isHeaderVisible} onToggleHeader={setIsHeaderVisible} />}
        {activeTab === 'agents' && <AgentStudio apiKey={apiKey} isHeaderVisible={isHeaderVisible} onToggleHeader={setIsHeaderVisible} />}
        {activeTab === 'apps' && <AppsStudio apiKey={apiKey} />}
        {activeTab === 'storage' && <StorageStudio />}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#080808] border border-[#8b00ff]/20 rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-[#8b00ff]/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-5 rounded-full" style={{background:'linear-gradient(180deg,#fff,#8b00ff)'}} />
              <h2 className="text-white font-black text-lg tracking-tight">Configuración</h2>
            </div>
            <p className="text-white/30 text-[13px] mb-8 pl-4">
              PH System AI — Preferencias y autenticación.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-[#8b00ff]/5 border border-[#8b00ff]/15 rounded-xl p-4">
                <label className="block text-xs font-bold text-[#8b00ff]/60 mb-2 tracking-widest uppercase">
                  API Key activa
                </label>
                <div className="text-[13px] font-mono text-white/70">
                  {apiKey.slice(0, 8)}••••••••••••••••
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleKeyChange}
                className="flex-1 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all border border-red-500/10"
              >
                Cambiar Key
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 h-10 rounded-xl bg-[#8b00ff]/10 text-white/70 hover:bg-[#8b00ff]/20 text-xs font-bold transition-all border border-[#8b00ff]/15"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
