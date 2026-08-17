import { NextResponse } from 'next/server';
import { completarJSON } from '@/lib/tiktok/llm';
import { promptExtraccionConocimiento } from '@/lib/tiktok/prompts';
import { aplicarExtraccion, resetKnowledge, resumenConocimiento } from '@/lib/tiktok/knowledgeStore';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Qué sabe el software ahora mismo. */
export async function GET() {
  return NextResponse.json(resumenConocimiento());
}

/**
 * Sube el PDF (o pega el texto) del método del cliente.
 * El software lo digiere y lo incorpora a su base de conocimiento.
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let documentos = [];
    let textoAdjunto = null;
    let nombre = 'documento';
    let tipo = 'pdf';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file) return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });

      nombre = file.name || 'documento';
      const buffer = Buffer.from(await file.arrayBuffer());

      if (buffer.length > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'El archivo pesa más de 25 MB. Divídelo.' }, { status: 400 });
      }

      if (nombre.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        documentos = [buffer.toString('base64')];
        tipo = 'pdf';
      } else {
        textoAdjunto = buffer.toString('utf8').slice(0, 200000);
        tipo = 'texto';
      }
    } else {
      const body = await request.json();
      if (!body.texto) return NextResponse.json({ error: 'Falta el texto del documento.' }, { status: 400 });
      textoAdjunto = String(body.texto).slice(0, 200000);
      nombre = body.nombre || 'texto pegado';
      tipo = 'texto';
    }

    const extraccion = await completarJSON({
      system:
        'Eres un extractor de metodología de marketing. Conviertes documentos en JSON estructurado, sin inventar nada que no esté en el documento.',
      user: promptExtraccionConocimiento(),
      documentos,
      textoAdjunto,
      maxTokens: 6000,
    });

    const resumen = aplicarExtraccion(extraccion, { nombre, tipo });

    return NextResponse.json({
      ok: true,
      mensaje: `"${nombre}" incorporado. El guionista ya trabaja con estas estructuras.`,
      extraido: {
        hooks: Object.keys(extraccion.familias_hook || {}),
        estrategias: Object.keys(extraccion.estrategias || {}),
        reglas: (extraccion.reglas_duras || []).length,
        ctas: (extraccion.cta_naturales || []).length,
        estructura: (extraccion.estructura_base || []).length,
      },
      conocimiento: resumen,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Vuelve a la base y olvida los documentos cargados. */
export async function DELETE() {
  return NextResponse.json({ ok: true, conocimiento: resetKnowledge() });
}
