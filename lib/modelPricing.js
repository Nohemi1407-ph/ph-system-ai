/**
 * PH System AI — Model Pricing Table
 * Source: muapi.ai/playground (scraped May 2026)
 *
 * ✓ = confirmed from muapi.ai official page
 * ~ = estimated from model tier / relative positioning
 *
 * Models with cost >= $0.80 are PREMIUM → require Pro plan or higher
 */

export const MODEL_PRICING = {

  // ─── TEXT TO IMAGE ──────────────────────────────────────────────────────────
  'nano-banana':                    { cost: 0.030, confirmed: true,  tier: 'budget',   type: 'image', label: 'Nano Banana' },
  'nano-banana-2':                  { cost: 0.020, confirmed: true,  tier: 'budget',   type: 'image', label: 'Nano Banana 2' },   // ~33% cheaper than pro
  'nano-banana-pro':                { cost: 0.030, confirmed: true,  tier: 'budget',   type: 'image', label: 'Nano Banana Pro' },
  'flux-schnell':                   { cost: 0.010, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Schnell' },
  'flux-dev':                       { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Dev' },
  'flux-dev-lora':                  { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Dev Lora' },
  'flux-2-dev':                     { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux 2 Dev' },
  'flux-2-flex':                    { cost: 0.025, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux 2 Flex' },
  'flux-2-pro':                     { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux 2 Pro' },
  'flux-2-klein-4b':                { cost: 0.020, confirmed: true,  tier: 'budget',   type: 'image', label: 'Flux 2 Klein 4B' },
  'flux-2-klein-9b':                { cost: 0.025, confirmed: true,  tier: 'budget',   type: 'image', label: 'Flux 2 Klein 9B' },
  'flux-kontext-dev-t2i':           { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Kontext Dev' },
  'flux-kontext-pro-t2i':           { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Kontext Pro' },
  'flux-kontext-max-t2i':           { cost: 0.080, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Kontext Max' },
  'flux-pulid':                     { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux PuLID' },
  'flux-redux':                     { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Redux' },
  'flux-krea-dev':                  { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Flux Krea Dev' },
  'sdxl-image':                     { cost: 0.010, confirmed: false, tier: 'budget',   type: 'image', label: 'SDXL' },
  'hidream-i1-fast':                { cost: 0.020, confirmed: false, tier: 'budget',   type: 'image', label: 'HiDream I1 Fast' },
  'hidream-i1-dev':                 { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'HiDream I1 Dev' },
  'hidream-i1-full':                { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'HiDream I1 Full' },
  'ai-anime-generator':             { cost: 0.010, confirmed: false, tier: 'budget',   type: 'image', label: 'AI Anime Generator' },
  'wan2.1-text-to-image':           { cost: 0.020, confirmed: false, tier: 'budget',   type: 'image', label: 'Wan 2.1 T2I' },
  'wan2.5-text-to-image':           { cost: 0.025, confirmed: false, tier: 'budget',   type: 'image', label: 'Wan 2.5 T2I' },
  'wan2.6-text-to-image':           { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Wan 2.6 T2I' },
  'qwen-image':                     { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Qwen Image' },
  'qwen-text-to-image-2512':        { cost: 0.035, confirmed: false, tier: 'budget',   type: 'image', label: 'Qwen T2I 2512' },
  'ideogram-v3-t2i':                { cost: 0.060, confirmed: false, tier: 'budget',   type: 'image', label: 'Ideogram v3' },
  'reve-text-to-image':             { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Reve T2I' },
  'chroma-image':                   { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Chroma Image' },
  'neta-lumina':                    { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Neta Lumina' },
  'perfect-pony-xl':                { cost: 0.020, confirmed: false, tier: 'budget',   type: 'image', label: 'Perfect Pony XL' },
  'z-image-turbo':                  { cost: 0.010, confirmed: false, tier: 'budget',   type: 'image', label: 'Z Image Turbo' },
  'z-image-base':                   { cost: 0.020, confirmed: false, tier: 'budget',   type: 'image', label: 'Z Image Base' },
  'leonardoai-phoenix-1.0':         { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Leonardo Phoenix 1.0' },
  'leonardoai-lucid-origin':        { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Leonardo Lucid Origin' },
  'hunyuan-image-2.1':              { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Hunyuan Image 2.1' },
  'hunyuan-image-3.0':              { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Hunyuan Image 3.0' },
  'bytedance-seedream-v3':          { cost: 0.030, confirmed: false, tier: 'budget',   type: 'image', label: 'Seedream v3' },
  'bytedance-seedream-v4':          { cost: 0.035, confirmed: false, tier: 'budget',   type: 'image', label: 'Seedream v4' },
  'bytedance-seedream-v4.5':        { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Seedream v4.5' },
  'seedream-5.0':                   { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'Seedream 5.0' },
  'vidu-q2-text-to-image':          { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Vidu Q2 T2I' },
  'kling-o1-text-to-image':         { cost: 0.027, confirmed: true,  tier: 'budget',   type: 'image', label: 'Kling O3 T2I' },
  'minimax-image-01':               { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'MiniMax Image 01' },
  'minimax-image-01-subject-reference': { cost: 0.060, confirmed: false, tier: 'budget', type: 'image', label: 'MiniMax Image 01 Subject' },
  'gpt4o-text-to-image':            { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'GPT-4o T2I' },
  'gpt-image-1.5':                  { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'GPT Image 1.5' },
  'gpt-image-2':                    { cost: 0.060, confirmed: false, tier: 'budget',   type: 'image', label: 'GPT Image 2' },
  'midjourney-v7-text-to-image':    { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'Midjourney v7' },
  'google-imagen4':                 { cost: 0.040, confirmed: false, tier: 'budget',   type: 'image', label: 'Google Imagen 4' },
  'google-imagen4-fast':            { cost: 0.020, confirmed: false, tier: 'budget',   type: 'image', label: 'Google Imagen 4 Fast' },
  'google-imagen4-ultra':           { cost: 0.080, confirmed: false, tier: 'budget',   type: 'image', label: 'Google Imagen 4 Ultra' },
  'grok-imagine-text-to-image':     { cost: 0.050, confirmed: false, tier: 'budget',   type: 'image', label: 'Grok Imagine T2I' },

  // ─── TEXT TO VIDEO — STANDARD (<$0.80) ──────────────────────────────────────
  'seedance-lite-t2v':              { cost: 0.25,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Lite T2V' },
  'seedance-pro-t2v':               { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Pro T2V' },
  'seedance-pro-t2v-fast':          { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Pro T2V Fast' },
  'seedance-v1.5-pro-t2v':          { cost: 0.50,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance 1.5 Pro T2V' },
  'seedance-v1.5-pro-t2v-fast':     { cost: 0.38,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance 1.5 Pro T2V Fast' },
  'wan2.1-text-to-video':           { cost: 0.18,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.1 T2V' },
  'wan2.2-text-to-video':           { cost: 0.22,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.2 T2V' },
  'wan2.2-5b-fast-t2v':             { cost: 0.15,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.2 5B Fast T2V' },
  'wan2.5-text-to-video':           { cost: 0.28,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.5 T2V' },
  'wan2.5-text-to-video-fast':      { cost: 0.20,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.5 T2V Fast' },
  'wan2.6-text-to-video':           { cost: 0.32,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.6 T2V' },
  'hunyuan-text-to-video':          { cost: 0.28,  confirmed: false, tier: 'standard', type: 'video', label: 'Hunyuan T2V' },
  'hunyuan-fast-text-to-video':     { cost: 0.18,  confirmed: false, tier: 'standard', type: 'video', label: 'Hunyuan T2V Fast' },
  'ltx-2-fast-text-to-video':       { cost: 0.10,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 Fast T2V' },
  'ltx-2-19b-text-to-video':        { cost: 0.22,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 19B T2V' },
  'ltx-2-pro-text-to-video':        { cost: 0.38,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 Pro T2V' },
  'pixverse-v4.5-t2v':              { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v4.5 T2V' },
  'pixverse-v5-t2v':                { cost: 0.35,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v5 T2V' },
  'pixverse-v5.5-t2v':              { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v5.5 T2V' },
  'minimax-hailuo-02-standard-t2v': { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'Hailuo 02 Standard T2V' },
  'minimax-hailuo-2.3-standard-t2v':{ cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Hailuo 2.3 Standard T2V' },
  'vidu-v2.0-t2v':                  { cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu v2.0 T2V' },
  'ovi-text-to-video':              { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'OVI T2V' },
  'grok-imagine-text-to-video':     { cost: 0.55,  confirmed: false, tier: 'standard', type: 'video', label: 'Grok Imagine T2V' },
  'kling-v3.0-standard-text-to-video': { cost: 0.420, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Standard T2V' },
  'kling-v3.0-omni-standard-text-to-video': { cost: 0.420, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Omni Standard T2V' },

  // ─── TEXT TO VIDEO — PREMIUM (≥$0.80) ───────────────────────────────────────
  'seedance-v2.0-t2v':              { cost: 0.90,  confirmed: false, tier: 'premium',  type: 'video', label: 'Seedance v2.0 T2V' },   // 40% off official
  'seedance-v2.0-extend':           { cost: 0.90,  confirmed: false, tier: 'premium',  type: 'video', label: 'Seedance v2.0 Extend' },
  'kling-v2.1-master-t2v':          { cost: 1.20,  confirmed: true,  tier: 'premium',  type: 'video', label: 'Kling v2.1 Master T2V' }, // USER CONFIRMED
  'kling-v2.5-turbo-pro-t2v':       { cost: 1.10,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.5 Turbo Pro T2V' },
  'kling-v2.6-pro-t2v':             { cost: 1.10,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.6 Pro T2V' },
  'kling-v3.0-pro-text-to-video':   { cost: 0.560, confirmed: true,  tier: 'standard', type: 'video', label: 'Kling v3.0 Pro T2V' },   // confirmed from page
  'kling-v3.0-omni-pro-text-to-video': { cost: 0.560, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Omni Pro T2V' },
  'kling-v3.0-omni-4k-text-to-video':  { cost: 2.679, confirmed: true, tier: 'premium',  type: 'video', label: 'Kling v3.0 Omni 4K T2V' },
  'kling-o1-text-to-video':         { cost: 1.50,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling O1 T2V' },
  'minimax-hailuo-02-pro-t2v':      { cost: 0.80,  confirmed: false, tier: 'premium',  type: 'video', label: 'Hailuo 02 Pro T2V' },
  'minimax-hailuo-2.3-pro-t2v':     { cost: 0.85,  confirmed: false, tier: 'premium',  type: 'video', label: 'Hailuo 2.3 Pro T2V' },
  'runway-text-to-video':           { cost: 0.85,  confirmed: false, tier: 'premium',  type: 'video', label: 'Runway T2V' },
  'veo3-text-to-video':             { cost: 1.20,  confirmed: false, tier: 'premium',  type: 'video', label: 'Veo 3 T2V' },
  'veo3-fast-text-to-video':        { cost: 0.60,  confirmed: true,  tier: 'standard', type: 'video', label: 'Veo 3 Fast T2V' },       // confirmed from page
  'veo3.1-text-to-video':           { cost: 1.00,  confirmed: false, tier: 'premium',  type: 'video', label: 'Veo 3.1 T2V' },
  'veo3.1-fast-text-to-video':      { cost: 0.60,  confirmed: true,  tier: 'standard', type: 'video', label: 'Veo 3.1 Fast T2V' },     // confirmed from page
  'veo3.1-lite-text-to-video':      { cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Veo 3.1 Lite T2V' },
  'openai-sora':                    { cost: 0.50,  confirmed: false, tier: 'standard', type: 'video', label: 'Sora' },
  'openai-sora-2-text-to-video':    { cost: 0.25,  confirmed: true,  tier: 'standard', type: 'video', label: 'Sora 2 T2V' },           // confirmed from page
  'openai-sora-2-pro-text-to-video':{ cost: 0.80,  confirmed: false, tier: 'premium',  type: 'video', label: 'Sora 2 Pro T2V' },

  // ─── IMAGE TO VIDEO — STANDARD ──────────────────────────────────────────────
  'seedance-lite-i2v':              { cost: 0.25,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Lite I2V' },
  'seedance-pro-i2v':               { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Pro I2V' },
  'seedance-pro-i2v-fast':          { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Pro I2V Fast' },
  'seedance-v1.5-pro-i2v':          { cost: 0.50,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance 1.5 Pro I2V' },
  'seedance-v1.5-pro-i2v-fast':     { cost: 0.38,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance 1.5 Pro I2V Fast' },
  'seedance-lite-reference-video':  { cost: 0.28,  confirmed: false, tier: 'standard', type: 'video', label: 'Seedance Lite Reference' },
  'wan2.1-image-to-video':          { cost: 0.18,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.1 I2V' },
  'wan2.1-reference-video':         { cost: 0.22,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.1 Reference' },
  'wan2.2-image-to-video':          { cost: 0.22,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.2 I2V' },
  'wan2.5-image-to-video':          { cost: 0.28,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.5 I2V' },
  'wan2.5-image-to-video-fast':     { cost: 0.20,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.5 I2V Fast' },
  'wan2.6-image-to-video':          { cost: 0.32,  confirmed: false, tier: 'standard', type: 'video', label: 'Wan 2.6 I2V' },
  'hunyuan-image-to-video':         { cost: 0.28,  confirmed: false, tier: 'standard', type: 'video', label: 'Hunyuan I2V' },
  'ltx-2-fast-image-to-video':      { cost: 0.10,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 Fast I2V' },
  'ltx-2-19b-image-to-video':       { cost: 0.22,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 19B I2V' },
  'ltx-2-pro-image-to-video':       { cost: 0.38,  confirmed: false, tier: 'standard', type: 'video', label: 'LTX 2 Pro I2V' },
  'pixverse-v4.5-i2v':              { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v4.5 I2V' },
  'pixverse-v5-i2v':                { cost: 0.35,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v5 I2V' },
  'pixverse-v5.5-i2v':              { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'PixVerse v5.5 I2V' },
  'minimax-hailuo-02-standard-i2v': { cost: 0.40,  confirmed: false, tier: 'standard', type: 'video', label: 'Hailuo 02 Standard I2V' },
  'minimax-hailuo-2.3-standard-i2v':{ cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Hailuo 2.3 Standard I2V' },
  'minimax-hailuo-2.3-fast':        { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'Hailuo 2.3 Fast' },
  'vidu-v2.0-i2v':                  { cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu v2.0 I2V' },
  'vidu-q1-reference':              { cost: 0.50,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu Q1 Reference' },
  'vidu-q2-reference':              { cost: 0.55,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu Q2 Reference' },
  'vidu-q2-pro-start-end-video':    { cost: 0.70,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu Q2 Pro Start-End' },
  'vidu-q2-turbo-start-end-video':  { cost: 0.50,  confirmed: false, tier: 'standard', type: 'video', label: 'Vidu Q2 Turbo Start-End' },
  'ovi-image-to-video':             { cost: 0.30,  confirmed: false, tier: 'standard', type: 'video', label: 'OVI I2V' },
  'grok-imagine-image-to-video':    { cost: 0.55,  confirmed: false, tier: 'standard', type: 'video', label: 'Grok Imagine I2V' },
  'midjourney-v7-image-to-video':   { cost: 0.60,  confirmed: false, tier: 'standard', type: 'video', label: 'Midjourney v7 I2V' },
  'kling-v2.1-standard-i2v':        { cost: 0.55,  confirmed: false, tier: 'standard', type: 'video', label: 'Kling v2.1 Standard I2V' },
  'kling-v3.0-standard-image-to-video': { cost: 0.420, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Standard I2V' },
  'kling-v3.0-omni-standard-image-to-video': { cost: 0.420, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Omni Standard I2V' },
  'kling-o1-standard-image-to-video': { cost: 0.70, confirmed: false, tier: 'standard', type: 'video', label: 'Kling O1 Standard I2V' },
  'kling-o1-standard-reference-to-video': { cost: 0.70, confirmed: false, tier: 'standard', type: 'video', label: 'Kling O1 Standard Ref I2V' },
  'veo3-fast-image-to-video':       { cost: 0.60,  confirmed: true,  tier: 'standard', type: 'video', label: 'Veo 3 Fast I2V' },
  'veo3.1-fast-image-to-video':     { cost: 0.60,  confirmed: true,  tier: 'standard', type: 'video', label: 'Veo 3.1 Fast I2V' },
  'veo3.1-lite-image-to-video':     { cost: 0.45,  confirmed: false, tier: 'standard', type: 'video', label: 'Veo 3.1 Lite I2V' },
  'openai-sora-2-image-to-video':   { cost: 0.25,  confirmed: true,  tier: 'standard', type: 'video', label: 'Sora 2 I2V' },

  // IMAGE TO VIDEO — PREMIUM
  'seedance-v2.0-i2v':              { cost: 0.90,  confirmed: false, tier: 'premium',  type: 'video', label: 'Seedance v2.0 I2V' },
  'kling-v2.1-master-i2v':          { cost: 1.20,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.1 Master I2V' },
  'kling-v2.1-pro-i2v':             { cost: 0.85,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.1 Pro I2V' },
  'kling-v2.5-turbo-pro-i2v':       { cost: 1.10,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.5 Turbo Pro I2V' },
  'kling-v2.5-turbo-std-i2v':       { cost: 0.80,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.5 Turbo Std I2V' },
  'kling-v2.6-pro-i2v':             { cost: 1.10,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.6 Pro I2V' },
  'kling-v2.6-std-motion-control':  { cost: 0.80,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling v2.6 Std Motion' },
  'kling-v3.0-pro-image-to-video':  { cost: 0.560, confirmed: true,  tier: 'standard', type: 'video', label: 'Kling v3.0 Pro I2V' },
  'kling-v3.0-omni-pro-image-to-video': { cost: 0.560, confirmed: true, tier: 'standard', type: 'video', label: 'Kling v3.0 Omni Pro I2V' },
  'kling-v3.0-omni-4k-image-to-video': { cost: 2.679, confirmed: true, tier: 'premium', type: 'video', label: 'Kling v3.0 Omni 4K I2V' },
  'kling-v3.0-pro-motion-control':  { cost: 0.560, confirmed: false, tier: 'standard', type: 'video', label: 'Kling v3.0 Pro Motion' },
  'kling-v3.0-std-motion-control':  { cost: 0.420, confirmed: false, tier: 'standard', type: 'video', label: 'Kling v3.0 Std Motion' },
  'kling-o1-image-to-video':        { cost: 1.50,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling O1 I2V' },
  'kling-o1-reference-to-video':    { cost: 1.50,  confirmed: false, tier: 'premium',  type: 'video', label: 'Kling O1 Reference I2V' },
  'minimax-hailuo-02-pro-i2v':      { cost: 0.80,  confirmed: false, tier: 'premium',  type: 'video', label: 'Hailuo 02 Pro I2V' },
  'minimax-hailuo-2.3-pro-i2v':     { cost: 0.85,  confirmed: false, tier: 'premium',  type: 'video', label: 'Hailuo 2.3 Pro I2V' },
  'runway-image-to-video':          { cost: 0.85,  confirmed: false, tier: 'premium',  type: 'video', label: 'Runway I2V' },
  'runway-act-two-i2v':             { cost: 0.90,  confirmed: false, tier: 'premium',  type: 'video', label: 'Runway Act Two I2V' },
  'veo3-image-to-video':            { cost: 1.20,  confirmed: false, tier: 'premium',  type: 'video', label: 'Veo 3 I2V' },
  'veo3.1-image-to-video':          { cost: 1.00,  confirmed: false, tier: 'premium',  type: 'video', label: 'Veo 3.1 I2V' },
  'veo3.1-reference-to-video':      { cost: 1.00,  confirmed: false, tier: 'premium',  type: 'video', label: 'Veo 3.1 Reference I2V' },
  'openai-sora-2-pro-image-to-video': { cost: 0.80, confirmed: false, tier: 'premium', type: 'video', label: 'Sora 2 Pro I2V' },

  // ─── LIP SYNC ────────────────────────────────────────────────────────────────
  'sync-lipsync':                   { cost: 0.15,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'Sync Lipsync' },
  'latent-sync':                    { cost: 0.20,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'Latent Sync' },
  'ltx-2-19b-lipsync':              { cost: 0.22,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'LTX 2 19B Lipsync' },
  'ltx-2.3-lipsync':                { cost: 0.22,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'LTX 2.3 Lipsync' },
  'veed-lipsync':                   { cost: 0.20,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'Veed Lipsync' },
  'creatify-lipsync':               { cost: 0.25,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'Creatify Lipsync' },
  'infinitetalk-image-to-video':    { cost: 0.30,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'InfiniteTalk I2V' },
  'infinitetalk-video-to-video':    { cost: 0.35,  confirmed: false, tier: 'standard', type: 'lipsync', label: 'InfiniteTalk V2V' },

  // ─── CINEMA / MARKETING ──────────────────────────────────────────────────────
  'seedance-2-vip-omni-reference':  { cost: 1.20,  confirmed: false, tier: 'premium',  type: 'cinema', label: 'Seedance 2 VIP Omni Ref' },
  'sd-2-vip-omni-reference-1080p':  { cost: 1.80,  confirmed: false, tier: 'premium',  type: 'cinema', label: 'SD 2 VIP Omni 1080p' },
  'sd-2-vip-extend-1080p':          { cost: 2.362, confirmed: true,  tier: 'premium',  type: 'cinema', label: 'SD 2 VIP Extend 1080p' },

  // ─── 3D MODELS ───────────────────────────────────────────────────────────────
  'meshy-6-image-to-3d':            { cost: 0.500, confirmed: true,  tier: 'standard', type: '3d', label: 'Meshy 6 I2-3D' },
  'meshy-6-text-to-3d':             { cost: 0.500, confirmed: true,  tier: 'standard', type: '3d', label: 'Meshy 6 T2-3D' },
  'meshy-6-multi-image-to-3d':      { cost: 0.500, confirmed: true,  tier: 'standard', type: '3d', label: 'Meshy 6 Multi I2-3D' },
  'tripo3d-h31-image-to-3d':        { cost: 0.300, confirmed: true,  tier: 'standard', type: '3d', label: 'Tripo3D H31 I2-3D' },
  'tripo3d-h31-text-to-3d':         { cost: 0.200, confirmed: true,  tier: 'standard', type: '3d', label: 'Tripo3D H31 T2-3D' },
  'tripo3d-h31-multiview-to-3d':    { cost: 0.200, confirmed: true,  tier: 'standard', type: '3d', label: 'Tripo3D H31 Multi-3D' },
  'tripo3d-p1-image-to-3d':         { cost: 0.500, confirmed: true,  tier: 'standard', type: '3d', label: 'Tripo3D P1 I2-3D' },
  'tripo3d-p1-text-to-3d':          { cost: 0.500, confirmed: true,  tier: 'standard', type: '3d', label: 'Tripo3D P1 T2-3D' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const PREMIUM_THRESHOLD = 0.80;

export function getModelPrice(modelId) {
  return MODEL_PRICING[modelId] ?? { cost: 0.05, tier: 'standard', type: 'image', confirmed: false, label: modelId };
}

export function isPremiumModel(modelId) {
  return getModelPrice(modelId).tier === 'premium';
}

export function getModelsAboveThreshold(threshold = PREMIUM_THRESHOLD) {
  return Object.entries(MODEL_PRICING)
    .filter(([, v]) => v.cost >= threshold)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .map(([id, info]) => ({ id, ...info }));
}

/** Plan → allowed tiers */
export const PLAN_MODEL_ACCESS = {
  trial:   ['budget'],
  starter: ['budget', 'standard'],
  creator: ['budget', 'standard'],
  pro:     ['budget', 'standard', 'premium'],
  agency:  ['budget', 'standard', 'premium'],
};

export function planCanUseModel(plan, modelId) {
  const allowedTiers = PLAN_MODEL_ACCESS[plan] ?? ['budget'];
  return allowedTiers.includes(getModelPrice(modelId).tier);
}

/** All confirmed premium models sorted by cost desc */
export const PREMIUM_MODELS = getModelsAboveThreshold(PREMIUM_THRESHOLD);
