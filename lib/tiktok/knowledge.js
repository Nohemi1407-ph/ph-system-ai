/**
 * PH TikTok Shop Engine — BASE DE CONOCIMIENTO
 * -----------------------------------------------------------------------------
 * Este archivo ES el cerebro del software. Todo lo que el cliente sabe sobre
 * cómo se hace un video que vende en TikTok Shop vive acá, en datos.
 *
 * Para actualizar el sistema cuando cambie lo que funciona:
 *   -> se edita SOLO este archivo. No se toca nada más.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ESTRUCTURA BASE OBLIGATORIA
// ─────────────────────────────────────────────────────────────────────────────

export const ESTRUCTURA_BASE = [
  {
    beat: 'hook',
    nombre: 'Hook',
    peso: 0.22, // % de la duración total
    objetivo: 'Detener el scroll en los primeros 3 segundos.',
    reglas: [
      'NO menciona el producto.',
      'NO empieza vendiendo.',
      'Arranca en movimiento o en medio de la acción, nunca con un saludo.',
      'Primera palabra fuerte: nada de "Hola chicos" o "Hoy les traigo".',
    ],
  },
  {
    beat: 'problema',
    nombre: 'Problema',
    peso: 0.2,
    objetivo: 'Que la audiencia se vea reflejada en una situación o necesidad.',
    reglas: [
      'Se muestra, no se explica.',
      'Es un problema específico y cotidiano, no una categoría genérica.',
      'Tono de queja normal entre amigos, no de comercial.',
    ],
  },
  {
    beat: 'solucion',
    nombre: 'Solución',
    peso: 0.2,
    objetivo: 'El producto aparece como respuesta natural al problema.',
    reglas: [
      'Aparece como algo que la persona ya usa, no como un producto que le pagaron por mostrar.',
      'Nunca se dice el nombre de la marca de forma publicitaria.',
      'Máximo un beneficio principal, no una lista.',
    ],
  },
  {
    beat: 'demostracion',
    nombre: 'Demostración',
    peso: 0.23,
    objetivo: 'Mostrar visualmente el beneficio o el funcionamiento.',
    reglas: [
      'Debe verse el producto en uso, en primer plano al menos una vez.',
      'Prioriza el momento satisfactorio (el antes/después, el clic, la textura, el resultado).',
      'Sin texto explicativo: se entiende con los ojos.',
    ],
  },
  {
    beat: 'cta',
    nombre: 'CTA natural',
    peso: 0.15,
    objetivo: 'Llamado a la acción con urgencia o escasez, sin sonar a anuncio.',
    reglas: [
      'Prohibido "compra ahora", "link en bio", "no te lo pierdas".',
      'Se dice de pasada, como un favor, no como un cierre de venta.',
      'Urgencia por disponibilidad o precio, nunca por presión.',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. FAMILIAS DE HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export const FAMILIAS_HOOK = {
  curiosidad: {
    nombre: 'Curiosidad',
    intencion: 'Abrir un loop que obliga a quedarse para cerrarlo.',
    plantillas: [
      'Nadie me creyó hasta que lo hice yo misma…',
      'Llevo {tiempo} haciendo esto mal y nadie me dijo nada.',
      'Esto no debería funcionar y sin embargo…',
      'Si tienes {problema}, mira lo que pasa en 3 segundos.',
    ],
    visual: 'Empieza con una acción a medio hacer, sin explicar qué es.',
  },
  chisme: {
    nombre: 'Chisme',
    intencion: 'Que se sienta información privada que te están pasando.',
    plantillas: [
      'No debería estar diciendo esto pero…',
      'Mi {persona} me va a matar por contar esto.',
      'Me lo pasó una amiga que trabaja en {lugar}.',
      'Borren esto antes de que lo vean.',
    ],
    visual: 'Cámara cerca, tono bajo, como confesión.',
  },
  secreto: {
    nombre: 'Secreto',
    intencion: 'Prometer acceso a algo que "los demás no saben".',
    plantillas: [
      'Esto es lo que hago cada mañana y nadie sabe.',
      'La gente que {resultado deseado} hace esto y no lo dice.',
      'Lo que no te cuentan de {tema}.',
    ],
    visual: 'Rutina real, íntima, sin producción.',
  },
  problema: {
    nombre: 'Problema',
    intencion: 'Nombrar el dolor exacto en la primera frase.',
    plantillas: [
      'Si te pasa {problema}, esto es para ti.',
      'Odio cuando {situación específica}.',
      'Llevo años con {problema} y ya probé de todo.',
    ],
    visual: 'Se ve el problema ocurriendo, no se narra.',
  },
  resultado: {
    nombre: 'Resultado',
    intencion: 'Mostrar el después antes que el antes.',
    plantillas: [
      'Esto pasó en {tiempo}.',
      'Así quedó y no toqué nada más.',
      'Mira la diferencia y después te cuento.',
    ],
    visual: 'Primer frame = el resultado más impactante.',
  },
  visual_absurdo: {
    nombre: 'Visual / Absurdo',
    intencion: 'Que la imagen sea tan rara que el dedo se frene solo.',
    plantillas: [
      '(sin diálogo: acción visual inesperada)',
      '¿Por qué nadie hace esto?',
      'Sé que se ve mal, espera.',
    ],
    visual: 'Acción exagerada, fuera de lugar o físicamente llamativa.',
  },
  interrupcion_scroll: {
    nombre: 'Interrupción del scroll',
    intencion: 'Romper el patrón del feed con un corte de ritmo.',
    plantillas: [
      'Para. Mira esto.',
      'Espera, devuélvete.',
      'Ok esto sí me sorprendió.',
    ],
    visual: 'Movimiento brusco de cámara o entrada abrupta al cuadro.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. ESTRATEGIAS CREATIVAS
// ─────────────────────────────────────────────────────────────────────────────

export const ESTRATEGIAS = {
  replica_viral: {
    nombre: 'Réplica de viral',
    directriz:
      'Toma la ESTRUCTURA de un formato viral conocido (no el contenido) y adáptala al producto. Nunca copiar guion, sí copiar el esqueleto de ritmo y revelación.',
    marcas: ['corte seco al segundo 2', 'revelación en el segundo final', 'repetición de una frase'],
  },
  storytelling: {
    nombre: 'Storytelling',
    directriz:
      'El producto vive dentro de una historia con un antes y un después. La historia capta primero; el producto entra en el minuto de la solución como parte del relato, jamás anunciado.',
    marcas: ['personaje con un objetivo', 'obstáculo concreto', 'cierre emocional'],
  },
  entretenimiento: {
    nombre: 'Entretenimiento',
    directriz:
      'El video se sostiene solo aunque quitaras el producto. Humor, sorpresa, exageración o una situación curiosa. El producto se integra sin frenar la diversión.',
    marcas: ['exageración física', 'timing cómico', 'giro inesperado'],
  },
  interaccion: {
    nombre: 'Interacción (debate / hate)',
    directriz:
      'Genera una escena que obligue a comentar: algo hecho "mal", una opinión discutible, un detalle raro. NUNCA se menciona que fue a propósito ni se pide comentar.',
    marcas: ['detalle deliberadamente polémico', 'afirmación discutible', 'acción rara sin explicar'],
    limite: 'Nada ofensivo, discriminatorio ni peligroso. La controversia es doméstica y ligera.',
  },
  demostracion_pura: {
    nombre: 'Demostración pura',
    directriz:
      'Cero narrativa: el producto haciendo lo que hace, en el ángulo más satisfactorio posible, con sonido real. Funciona para productos visualmente impactantes.',
    marcas: ['macro', 'antes/después en un solo plano', 'sonido ASMR del producto'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CTA NATURALES
// ─────────────────────────────────────────────────────────────────────────────

export const CTA_NATURALES = [
  'Te lo dejo en el carrito.',
  'Aprovecha mientras siga disponible.',
  'Mira si todavía tiene descuento.',
  'Está abajo, por si lo quieres.',
  'Yo pedí dos por si acaso.',
  'Si se acaba otra vez no digan que no avisé.',
  'Ahí abajo está, hagan lo que quieran.',
  'No sé cuánto dure ese precio.',
  'Lo dejé enlazado, no me hago responsable.',
];

export const CTA_PROHIBIDOS = [
  'compra ahora',
  'link en bio',
  'no te lo pierdas',
  'oferta por tiempo limitado',
  'haz clic aquí',
  'adquiérelo ya',
  'la mejor compra de tu vida',
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. EJES DE VARIACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export const EJES_VARIACION = {
  emocion: [
    'sorpresa', 'alivio', 'frustración', 'complicidad', 'orgullo',
    'humor seco', 'urgencia tranquila', 'ternura', 'incredulidad',
  ],
  escenario: [
    'baño en la mañana', 'cocina desordenada', 'carro estacionado', 'cuarto en la noche',
    'sala con luz natural', 'oficina en casa', 'pasillo del supermercado', 'balcón',
    'lavandería', 'closet', 'mesa de comedor', 'entrada de la casa',
  ],
  ritmo: [
    'rápido con cortes secos',
    'lento y confesional',
    'medio, tipo vlog',
    'arranque explosivo y bajada',
    'sube en escalera hasta el final',
  ],
  angulo_venta: [
    'ahorro de tiempo',
    'ahorro de dinero',
    'me daba pena / vergüenza',
    'me lo recomendaron y no creía',
    'lo compré por chisme y funcionó',
    'lo uso todos los días sin pensarlo',
    'reemplazó tres cosas que tenía',
    'la versión cara no valía la pena',
    'regalo que terminé usando yo',
    'nadie nota que lo uso',
  ],
  tipo_historia: [
    'confesión personal',
    'me pasó ayer',
    'consejo de alguien mayor',
    'error que cometí',
    'reto o apuesta',
    'comparación con lo que usaba antes',
    'reacción a un comentario',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. REGLAS DURAS (se aplican SIEMPRE)
// ─────────────────────────────────────────────────────────────────────────────

export const REGLAS_DURAS = [
  'El video debe parecer contenido orgánico de un creador real, NO un anuncio.',
  'Los primeros 3 segundos jamás mencionan ni muestran el producto de forma publicitaria.',
  'Nunca se dice ni se sugiere que el video fue hecho con inteligencia artificial.',
  'Nunca se dice ni se sugiere que la escena se hizo para generar comentarios.',
  'Nada de música épica de anuncio ni voz de locutor: audio ambiente y voz natural.',
  'Sin logos de marca en pantalla, sin precios escritos, sin banners.',
  'Formato vertical 9:16 obligatorio.',
  'Una sola idea por video. Si hay dos beneficios, se hacen dos videos.',
  'El diálogo se escribe como habla la gente, con muletillas, no como texto escrito.',
  'Nunca se repite el mismo hook entre variaciones del mismo producto.',
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. CUMPLIMIENTO TIKTOK SHOP
//    (evita que el video se rechace o la cuenta se limite)
// ─────────────────────────────────────────────────────────────────────────────

export const COMPLIANCE = {
  frases_prohibidas: [
    'cura', 'curar', 'elimina la enfermedad', 'garantizado', '100% efectivo',
    'aprobado por la FDA', 'sin efectos secundarios', 'baja X kilos en X días',
    'reemplaza a tu médico', 'milagroso', 'resultados garantizados',
    'el mejor del mundo', 'número 1 del mercado',
  ],
  categorias_sensibles: {
    salud_suplementos: 'Hablar solo de experiencia personal ("a mí me ayudó con..."), nunca de curación ni de resultados médicos.',
    belleza_piel: 'Nada de "elimina el acné/las arrugas". Usar "se siente", "se ve", "a mí me pasó".',
    perdida_peso: 'Prohibido mencionar kilos, tallas o tiempos. Solo sensación y hábito.',
    electronica: 'No inventar especificaciones técnicas ni comparar con marcas por nombre.',
    infantil: 'Sin menores en escena. Sin claims de seguridad ni de desarrollo.',
  },
  reglas: [
    'Sin marcas de agua de otras plataformas.',
    'Sin nombres de competidores.',
    'Sin testimonios de terceros inventados en primera persona médica.',
    'El avatar habla siempre de su propia experiencia, en primera persona.',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. ESPECIFICACIÓN TÉCNICA DE SALIDA
// ─────────────────────────────────────────────────────────────────────────────

export const SPEC_TECNICA = {
  aspect_ratio: '9:16',
  resolucion_objetivo: '1080x1920',
  duracion_recomendada_s: [8, 10, 15],
  safe_zone: {
    superior_px: 130,   // barra de búsqueda de TikTok
    inferior_px: 480,   // caption, botones y ficha de producto del Shop
    derecha_px: 180,    // columna de acciones
  },
  audio: 'Voz del avatar + ambiente. Sin música de librería sobre la voz.',
  primer_frame:
    'El primer frame debe funcionar como miniatura: cara o acción visible, sin texto, bien iluminado.',
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function beatsConTiempos(duracionSegundos = 10) {
  let t = 0;
  return ESTRUCTURA_BASE.map((b) => {
    const dur = Math.max(1, Math.round(duracionSegundos * b.peso * 10) / 10);
    const desde = Math.round(t * 10) / 10;
    t = Math.min(duracionSegundos, t + dur);
    return { ...b, desde, hasta: Math.round(t * 10) / 10, ventana: `${desde}s-${Math.round(t * 10) / 10}s` };
  });
}

export const KNOWLEDGE_VERSION = '1.0.0';
