import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata = {
  title: 'PH System AI — TikTok Shop Engine',
  description: 'Un producto + un avatar → videos con estructura de venta, listos para TikTok Shop.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
