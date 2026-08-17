import { redirect } from 'next/navigation';

// Una sola vista: el motor de TikTok Shop.
export default function Home() {
  redirect('/tiktok');
}
