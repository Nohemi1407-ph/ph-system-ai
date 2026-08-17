/**
 * PH TikTok Shop Engine — SISTEMA DE SHOTS
 * -----------------------------------------------------------------------------
 * Estructura tomada del "Video Agent System Prompt" (repo agent-design) y
 * adaptada a lo que este proyecto ya hace: un avatar real + un producto real,
 * clips de Veo encadenados, y venta en TikTok Shop.
 *
 * Tres ideas que trae ese documento y que aqui faltaban:
 *
 *   1. ARCO NARRATIVO segun el numero de shots (no siempre hook/contexto/cta).
 *   2. CATALOGO DE MOVIMIENTOS de camara, sin repetir dos seguidos.
 *   3. SISTEMA DE DISENO BLOQUEADO: lo que NO puede cambiar entre tomas se
 *      declara una vez y se repite literal en cada shot; solo varian sujeto,
 *      accion, camara y dialogo.
 *
 * Diferencia importante con el documento original: alli la referencia es un
 * "lenguaje visual" a reinterpretar. Aqui la referencia es la CARA del avatar y
 * el PRODUCTO del cliente: se copian literal, no se reinterpretan nunca. Lo que
 * se reinterpreta por shot es la ESCENA (accion, encuadre, entorno del beat).
 */

// ─── 1. Catalogo de movimientos ──────────────────────────────────────────────
// `veo` es la frase que entiende el modelo de video. `enum` mantiene compatibilidad
// con el vocabulario corto que ya usaba el guion largo.

export const CATALOGO_MOVIMIENTOS = {
  open_push_in: {
    id: 'open_push_in',
    enum: 'dolly_in',
    veo: 'slow steady dolly push-in toward the subject',
    uso: 'hook — abre acercandose a la persona',
  },
  orbital: {
    id: 'orbital',
    enum: 'orbit',
    veo: 'camera arcs slowly around the subject, keeping them centered',
    uso: 'demostracion — muestra el producto desde varios angulos',
  },
  handheld_reveal: {
    id: 'handheld_reveal',
    enum: 'handheld',
    veo: 'loose handheld camera that reframes to reveal something new in the scene',
    uso: 'problema / insight — descubre algo',
  },
  locked_static: {
    id: 'locked_static',
    enum: 'static',
    veo: 'locked static frame, no camera movement at all',
    uso: 'frase clave — la atencion va al dialogo',
  },
  whip_pan: {
    id: 'whip_pan',
    enum: 'pan_right',
    veo: 'fast whip pan that snaps to the next framing',
    uso: 'transicion / scroll-stopper',
  },
  top_down_reveal: {
    id: 'top_down_reveal',
    enum: 'dolly_down',
    veo: 'camera descends from a high angle down to eye level',
    uso: 'contexto — situa la escena',
  },
  low_angle_hero: {
    id: 'low_angle_hero',
    enum: 'dolly_up',
    veo: 'low angle camera rising slightly, subject looks confident',
    uso: 'transformacion / cierre con fuerza',
  },
  close_up_locked: {
    id: 'close_up_locked',
    enum: 'static',
    veo: 'tight close-up, locked frame, product clearly readable',
    uso: 'CTA — cierre',
  },
};

export const MOVIMIENTOS = Object.keys(CATALOGO_MOVIMIENTOS);

export function describirMovimiento(id) {
  const m = CATALOGO_MOVIMIENTOS[id];
  return m ? m.veo : CATALOGO_MOVIMIENTOS.locked_static.veo;
}

// ─── 2. Arco narrativo ───────────────────────────────────────────────────────
// El ultimo shot es SIEMPRE el CTA. Sin excepciones.

const ROLES = {
  hook: {
    id: 'hook',
    objetivo: 'Romper el scroll en los primeros 2 segundos. Frase que genera tension o curiosidad.',
    movimientoSugerido: 'open_push_in',
  },
  problema: {
    id: 'problema',
    objetivo: 'Nombrar el dolor concreto que ya sufre quien mira. Nada de generalidades.',
    movimientoSugerido: 'handheld_reveal',
  },
  insight: {
    id: 'insight',
    objetivo: 'La razon por la que el problema existe, o el detalle que nadie cuenta.',
    movimientoSugerido: 'locked_static',
  },
  solucion: {
    id: 'solucion',
    objetivo: 'Aparece el producto como salida natural, no como anuncio.',
    movimientoSugerido: 'orbital',
  },
  demostracion: {
    id: 'demostracion',
    objetivo: 'Mostrar el momento satisfactorio del producto en uso. Es la prueba.',
    movimientoSugerido: 'orbital',
  },
  transformacion: {
    id: 'transformacion',
    objetivo: 'El antes/despues o el resultado ya conseguido. Emocion, no dato.',
    movimientoSugerido: 'low_angle_hero',
  },
  cta: {
    id: 'cta',
    objetivo:
      'Cierre que manda al carrito NARANJA de TikTok Shop (elemento real de la interfaz). Menciona oferta si la hay.',
    movimientoSugerido: 'close_up_locked',
  },
  hero: {
    id: 'hero',
    objetivo: 'Video de una sola toma: hook, demostracion y CTA comprimidos en un plano.',
    movimientoSugerido: 'open_push_in',
  },
};

export function rolInfo(id) {
  return ROLES[id] || ROLES.insight;
}

/**
 * Reparte roles narrativos segun cuantos shots caben.
 * Mapeo del documento, ampliado con los beats de venta que ya usaba el proyecto.
 */
export function arcoNarrativo(n) {
  const total = Math.max(1, Math.round(Number(n) || 1));

  if (total === 1) return ['hero'];
  if (total === 2) return ['hook', 'cta'];
  if (total === 3) return ['hook', 'demostracion', 'cta'];
  if (total === 4) return ['hook', 'problema', 'solucion', 'cta'];
  if (total === 5) return ['hook', 'problema', 'solucion', 'demostracion', 'cta'];

  // 6 o mas: se estira por el medio con insight/demostracion alternados.
  const medio = [];
  const relleno = ['insight', 'demostracion'];
  for (let i = 0; i < total - 5; i++) medio.push(relleno[i % relleno.length]);

  return ['hook', 'problema', 'solucion', ...medio, 'transformacion', 'cta'];
}

/**
 * Asigna movimiento de camara a cada shot.
 * Reglas del documento: primero abre acercandose, ultimo cierra en close-up,
 * y nunca dos shots consecutivos con el mismo movimiento.
 */
export function planMovimientos(roles) {
  const usados = [];

  roles.forEach((rol, i) => {
    const esUltimo = i === roles.length - 1;
    let candidato = rolInfo(rol).movimientoSugerido;

    if (i === 0) candidato = 'open_push_in';
    if (esUltimo && roles.length > 1) candidato = 'close_up_locked';

    // Sin repetir el anterior: se busca la siguiente alternativa del catalogo.
    if (i > 0 && candidato === usados[i - 1]) {
      const alternativas = MOVIMIENTOS.filter((m) => m !== usados[i - 1] && m !== 'close_up_locked');
      candidato = alternativas[i % alternativas.length] || candidato;
    }
    usados.push(candidato);
  });

  return usados;
}

/** Roles + movimientos ya combinados: lo que consume el guionista. */
export function planDeShots(n) {
  const roles = arcoNarrativo(n);
  const movimientos = planMovimientos(roles);
  return roles.map((rol, i) => ({
    shot_id: String(i + 1),
    rol,
    objetivo: rolInfo(rol).objetivo,
    movimiento: movimientos[i],
    movimiento_veo: describirMovimiento(movimientos[i]),
    es_ultimo: i === roles.length - 1,
  }));
}

// ─── 3. Sistema de diseno bloqueado ──────────────────────────────────────────

/**
 * Lo que NO puede cambiar entre tomas. Se declara una vez y se repite literal en
 * cada prompt. Es lo que hace que 5 clips parezcan un solo video y no 5 videos.
 */
export function construirSistemaDeDiseno({
  avatarFijo,
  productoFijo,
  entorno = '',
  iluminacion = '',
  acabado = 'authentic UGC phone footage, natural imperfect lighting, no studio look',
  ritmo = 'natural creator pacing, no music-video editing',
  idiomaDialogo = 'Spanish',
}) {
  return Object.freeze({
    avatarFijo: String(avatarFijo || '').trim(),
    productoFijo: String(productoFijo || '').trim(),
    entorno: String(entorno || '').trim(),
    iluminacion: String(iluminacion || '').trim(),
    acabado,
    ritmo,
    idiomaDialogo,
  });
}

/** Bloque de texto que se anexa a CADA shot para blindar la consistencia. */
export function bloqueSistema(sistema) {
  return {
    locked_subject: sistema.avatarFijo,
    locked_product: sistema.productoFijo,
    locked_environment: sistema.entorno || undefined,
    locked_lighting: sistema.iluminacion || undefined,
    locked_finish: sistema.acabado,
    locked_pacing: sistema.ritmo,
    consistency_rule:
      'These locked values are identical in every shot of this video. Do not restyle, recolor, age, redress or redesign the person or the product between shots. The product must be an exact replica of its locked description: same color, same label, same shape, same packaging.',
  };
}

// ─── 4. Validacion de consistencia ───────────────────────────────────────────

const PALABRAS_ACCESORIO = ['wearing the product', 'puts on the product', 'around her neck', 'around his neck', 'on her wrist', 'on his wrist'];

/**
 * Revisa el guion ANTES de gastar creditos. Devuelve la lista de fallos.
 * Cada fallo trae `arreglo`: la instruccion que se le manda al LLM para corregir.
 */
/**
 * Arregla en codigo lo que se puede arreglar en codigo.
 *
 * Antes esto se le pedia a un LLM ("corrige este guion"), lo que costaba una
 * llamada entera —decenas de segundos— para reescribir campos que sabemos
 * exactamente cuales deben ser. Solo lo que un LLM tiene que reescribir de
 * verdad (dialogo que falta, producto usado como accesorio) queda como fallo.
 *
 * @returns {{shots: Array, arreglados: string[], fallos: Array}}
 */
export function normalizarShots(shots, sistema, plan) {
  const arreglados = [];

  const normalizados = (shots || []).map((shot, i) => {
    const esperado = plan?.[i];
    const copia = { ...shot };

    // El rol y la camara los decide el plan, no el LLM.
    if (esperado) {
      if (copia.rol !== esperado.rol) {
        copia.rol = esperado.rol;
        arreglados.push(`shot ${i + 1}: rol -> ${esperado.rol}`);
      }
      if (copia.camera?.movement !== esperado.movimiento) {
        copia.camera = { ...(copia.camera || {}), movement: esperado.movimiento };
        arreglados.push(`shot ${i + 1}: camara -> ${esperado.movimiento}`);
      }
    }

    // La descripcion fija del avatar es UNA cadena conocida. Si el LLM la
    // reescribio, se pisa: no hay nada que negociar.
    if (sistema?.avatarFijo && copia.subject?.fixed_description !== sistema.avatarFijo) {
      copia.subject = { ...(copia.subject || {}), fixed_description: sistema.avatarFijo };
      arreglados.push(`shot ${i + 1}: descripcion del avatar restaurada`);
    }

    // Entorno e iluminacion tampoco varian entre tomas.
    if (sistema?.entorno || sistema?.iluminacion) {
      const env = { ...(copia.environment || {}) };
      if (sistema.entorno && env.location !== sistema.entorno) {
        env.location = sistema.entorno;
        arreglados.push(`shot ${i + 1}: entorno unificado`);
      }
      if (sistema.iluminacion && env.lighting !== sistema.iluminacion) {
        env.lighting = sistema.iluminacion;
        arreglados.push(`shot ${i + 1}: iluminacion unificada`);
      }
      copia.environment = env;
    }

    return copia;
  });

  return { shots: normalizados, arreglados, fallos: validarConsistencia(normalizados, sistema, plan) };
}

export function validarConsistencia(shots, sistema, plan) {
  const fallos = [];
  if (!Array.isArray(shots) || !shots.length) {
    fallos.push({ shot: null, regla: 'sin_shots', arreglo: 'El guion no devolvio ningun shot.' });
    return fallos;
  }

  shots.forEach((shot, i) => {
    const id = shot?.shot_id || String(i + 1);
    const esperado = plan?.[i];

    const descripcion = String(shot?.subject?.fixed_description || '');
    if (sistema.avatarFijo && descripcion.trim() !== sistema.avatarFijo) {
      fallos.push({
        shot: id,
        regla: 'avatar_no_bloqueado',
        arreglo: `En el shot ${id}, "subject.fixed_description" debe ser LITERALMENTE la descripcion fija del avatar, sin reescribirla.`,
      });
    }

    if (!String(shot?.subject?.dialogo || '').trim()) {
      fallos.push({
        shot: id,
        regla: 'sin_dialogo',
        arreglo: `El shot ${id} se quedo sin dialogo. Todo shot habla, incluido el CTA.`,
      });
    }

    const interaccion = `${shot?.product?.interaction || ''} ${shot?.subject?.action || ''}`.toLowerCase();
    if (PALABRAS_ACCESORIO.some((p) => interaccion.includes(p))) {
      fallos.push({
        shot: id,
        regla: 'producto_como_accesorio',
        arreglo: `En el shot ${id} el producto se lleva puesto. Solo se muestra, se sostiene o se usa.`,
      });
    }

    if (esperado && shot?.camera?.movement && shot.camera.movement !== esperado.movimiento) {
      // No es un fallo bloqueante: se corrige en silencio al aplanar el prompt.
      shot.camera.movement = esperado.movimiento;
    }

    if (i > 0) {
      const anterior = shots[i - 1]?.camera?.movement;
      if (anterior && anterior === shot?.camera?.movement) {
        fallos.push({
          shot: id,
          regla: 'movimiento_repetido',
          arreglo: `El shot ${id} repite el movimiento de camara del anterior (${anterior}). Usa otro del catalogo.`,
        });
      }
    }
  });

  const ultimo = shots[shots.length - 1];
  if (shots.length > 1 && String(ultimo?.rol || '').toLowerCase() !== 'cta') {
    fallos.push({
      shot: ultimo?.shot_id || String(shots.length),
      regla: 'cierre_sin_cta',
      arreglo: 'El ultimo shot SIEMPRE es el CTA al carrito naranja de TikTok Shop.',
    });
  }

  return fallos;
}
