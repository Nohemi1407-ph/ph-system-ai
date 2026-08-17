import { NextResponse } from 'next/server';
import { fichaForense, fusionarContexto, identidadCanonica, necesitaContexto } from '@/lib/tiktok/producto';
import { llmConfigurado } from '@/lib/tiktok/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Lee la foto del producto y devuelve lo que el sistema entendio.
 *
 * Se llama en cuanto el vendedor sube la foto, ANTES de generar nada. Asi ve lo
 * que la IA leyo (y lo que NO pudo leer) y puede corregirlo escribiendo. Es la
 * diferencia entre descubrir que el producto salio mal despues de pagar el
 * video, o corregirlo antes por cero pesos.
 */
export async function POST(request) {
  if (!llmConfigurado()) {
    return NextResponse.json(
      { error: 'Falta la llave del modelo de texto (KIE_API_KEY, ANTHROPIC_API_KEY u OPENAI_API_KEY).' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { productoUrl, producto: manual = {}, idioma = 'es' } = body;

  if (!productoUrl) {
    return NextResponse.json({ error: 'Falta la imagen del producto.' }, { status: 400 });
  }

  try {
    const ficha = fusionarContexto(await fichaForense({ imagenProducto: productoUrl, idioma }), manual);

    // Si el motor de texto esta caido no sirve de nada pedirle al vendedor que
    // escriba el contexto: el guionista tampoco va a poder trabajar. Se devuelve
    // 503 para que la UI lo diga tal cual, en vez de disfrazarlo de "la foto no
    // alcanza".
    if (ficha.error_motor) {
      return NextResponse.json(
        {
          error: `El motor de texto no responde: ${ficha.error_motor}`,
          motor_caido: true,
          que_hacer:
            'Revisa la llave del modelo de texto en Railway (ANTHROPIC_API_KEY / KIE_API_KEY / OPENAI_API_KEY). Escribir el contexto a mano no resuelve esto: el guionista tambien necesita el modelo.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ficha,
      // La cadena literal que se le va a mandar al modelo de video. Se devuelve
      // a proposito: si el vendedor la lee y algo no cuadra, lo corrige ahora.
      identidad: identidadCanonica(ficha),
      necesita_contexto: necesitaContexto(ficha),
      falta_contexto: ficha.falta_contexto,
    });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo analizar el producto: ${e.message}` }, { status: 502 });
  }
}
