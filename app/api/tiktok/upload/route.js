import { NextResponse } from 'next/server';
import { getProveedor, llaveDe, PROVEEDOR_DEFAULT } from '@/lib/tiktok/providers';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const proveedorId = form.get('proveedor') || PROVEEDOR_DEFAULT;

    if (!file) return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });

    const apiKey = llaveDe(proveedorId, request);
    if (!apiKey) {
      return NextResponse.json(
        { error: `Falta la API key de ${proveedorId}. Configúrala en las variables de entorno.` },
        { status: 401 }
      );
    }

    const url = await getProveedor(proveedorId).subirArchivo(file, apiKey);
    return NextResponse.json({ url, proveedor: proveedorId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
