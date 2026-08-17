import { NextResponse } from 'next/server';
import { listarMotores, MOTOR_DEFAULT } from '@/lib/tiktok/engines';
import { IDIOMAS_DISPONIBLES } from '@/lib/tiktok/prompts';
import { getKnowledge } from '@/lib/tiktok/knowledgeStore';
import { resumenConocimiento } from '@/lib/tiktok/knowledgeStore';
import { infoLLM } from '@/lib/tiktok/llm';
import { proveedoresDisponibles, PROVEEDOR_DEFAULT, getProveedor, llaveDe } from '@/lib/tiktok/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const proveedores = proveedoresDisponibles(request);
  const configurados = proveedores.filter((p) => p.configurado).map((p) => p.id);

  const K = getKnowledge();
  const activo = configurados.includes(PROVEEDOR_DEFAULT) ? PROVEEDOR_DEFAULT : configurados[0] || null;
  const llave = activo ? llaveDe(activo, request) : null;

  return NextResponse.json({
    proveedores,
    proveedor_default: PROVEEDOR_DEFAULT,
    motores: listarMotores(configurados.length ? configurados : null),
    motor_default: MOTOR_DEFAULT,
    idiomas: IDIOMAS_DISPONIBLES,
    estrategias: Object.entries(K.ESTRATEGIAS).map(([id, e]) => ({ id, nombre: e.nombre })),
    conocimiento: resumenConocimiento(),
    llm: infoLLM(),
    saldo: llave ? await getProveedor(activo).saldo(llave) : null,
  });
}
