import { NextResponse } from 'next/server';

// GET /api/download?url=<encoded_url>&filename=<name>
// Descarga el archivo desde el servidor para evitar problemas de CORS
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'archivo.mp4';

  if (!url) {
    return NextResponse.json({ error: 'url requerida' }, { status: 400 });
  }

  // Solo permitir URLs de dominios conocidos (seguridad)
  const allowed = [
    'cloudfront.net',
    'muapi.ai',
    'amazonaws.com',
    'storage.googleapis.com',
    'cdn.',
    'blob.core.windows.net',
  ];
  const isAllowed = allowed.some(d => url.includes(d));
  if (!isAllowed) {
    // Permitir cualquier https en dev — en producción restringir más
    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL no permitida' }, { status: 403 });
    }
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PH-System-AI/1.0' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error al obtener archivo: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': body.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
