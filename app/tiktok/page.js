import { redirect } from 'next/navigation';

// TikTok vive dentro del dashboard, como una pestaña mas.
// Esta ruta se conserva solo para que los enlaces viejos sigan funcionando.
export default function TikTokPage() {
  redirect('/studio/tiktok');
}
