import { NextResponse } from 'next/server';
import { paraInterfaz } from '@/lib/kie/catalogo';

export const runtime = 'nodejs';

// La interfaz pinta sus opciones a partir de aquí: añadir un modelo al
// catálogo lo hace aparecer en los studios sin tocar la UI.
export async function GET() {
  return NextResponse.json({
    t2i: paraInterfaz('t2i'),
    i2i: paraInterfaz('i2i'),
    t2v: paraInterfaz('t2v'),
    i2v: paraInterfaz('i2v'),
    v2v: paraInterfaz('v2v'),
    lipsync: paraInterfaz('lipsync'),
  });
}
