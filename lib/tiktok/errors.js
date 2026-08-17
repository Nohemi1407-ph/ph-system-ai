/**
 * PH TikTok Shop Engine — ERRORES ESTRUCTURADOS
 * -----------------------------------------------------------------------------
 * Antes cada fallo llegaba al cliente como texto crudo del proveedor
 * ("Kie 500 · ..."), imposible de tratar distinto segun el caso.
 *
 * Aqui todo fallo se traduce a un CODIGO estable. El front y el agente pueden
 * reaccionar: saldo bajo -> pedir recarga; filtro de audio -> reintentar sin
 * dialogo; timeout -> ofrecer recuperar por taskId.
 *
 * El taskId viaja SIEMPRE que exista: si el proveedor ya cobro los creditos y
 * el video se perdio, es lo unico que permite recuperarlo.
 */

export const CODIGOS = {
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  TIMEOUT: 'TIMEOUT',
  FILTERED: 'FILTERED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STITCH_FAILED: 'STITCH_FAILED',
  NO_SCRIPT: 'NO_SCRIPT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  CONSISTENCY: 'CONSISTENCY',
};

/** Codigo -> que puede hacer el cliente. Se manda junto al error. */
export const SUGERENCIAS = {
  INSUFFICIENT_CREDITS: 'Recarga creditos en el proveedor y vuelve a lanzar el lote.',
  TIMEOUT: 'El proveedor no respondio a tiempo. Si hay taskId, el video puede recuperarse desde el panel del proveedor.',
  FILTERED: 'El filtro de contenido del proveedor rechazo la toma. Se reintenta sin dialogo hablado.',
  DOWNLOAD_FAILED: 'El video se genero pero no se pudo descargar. Reintenta la descarga con la URL del proveedor.',
  UPLOAD_FAILED: 'No se pudo subir la referencia al proveedor. Revisa el archivo y la llave.',
  STITCH_FAILED: 'Los clips existen pero no se pudieron unir. Descargalos por separado.',
  NO_SCRIPT: 'El modelo de texto no devolvio guion valido. El detalle del proveedor va en el mensaje.',
  PROVIDER_ERROR: 'Fallo del proveedor de video. Reintenta o cambia de motor.',
  CONSISTENCY: 'La toma rompio el sistema de diseno del lote. Se regenera pidiendo calcar el shot 1.',
};

export class ErrorVideo extends Error {
  constructor(codigo, mensaje, detalles = {}) {
    super(mensaje);
    this.name = 'ErrorVideo';
    this.codigo = CODIGOS[codigo] ? codigo : CODIGOS.PROVIDER_ERROR;
    this.sugerencia = SUGERENCIAS[this.codigo];
    // taskId: critico para recuperar un video ya cobrado.
    this.taskId = detalles.taskId || null;
    this.shotId = detalles.shotId || null;
    this.detalles = detalles;
  }

  /** Forma serializable: lo que se guarda en el job y viaja al front. */
  aJSON() {
    return {
      codigo: this.codigo,
      mensaje: this.message,
      sugerencia: this.sugerencia,
      taskId: this.taskId,
      shotId: this.shotId,
      ...(this.detalles.saldo !== undefined ? { saldo: this.detalles.saldo } : {}),
      ...(this.detalles.requeridos !== undefined ? { requeridos: this.detalles.requeridos } : {}),
    };
  }
}

/**
 * Traduce cualquier error suelto (del proveedor, de ffmpeg, de fetch) a ErrorVideo.
 * Si ya es un ErrorVideo, solo le completa el contexto que falte.
 */
export function clasificar(error, contexto = {}) {
  if (error instanceof ErrorVideo) {
    error.taskId ||= contexto.taskId || null;
    error.shotId ||= contexto.shotId || null;
    return error;
  }

  const msg = String(error?.message || error || 'Error desconocido');
  const m = msg.toLowerCase();

  let codigo = CODIGOS.PROVIDER_ERROR;
  if (m.includes('audio_filtered') || m.includes('filtered') || m.includes('public_error') || m.includes('unable to generate audio')) {
    codigo = CODIGOS.FILTERED;
  } else if (m.includes('tiempo de espera') || m.includes('timeout') || m.includes('timed out')) {
    codigo = CODIGOS.TIMEOUT;
  } else if (m.includes('insufficient') || m.includes('credit') || m.includes('saldo')) {
    codigo = CODIGOS.INSUFFICIENT_CREDITS;
  } else if (m.includes('no se pudo descargar') || m.includes('download')) {
    codigo = CODIGOS.DOWNLOAD_FAILED;
  } else if (m.includes('no devolvió la url del archivo') || m.includes('no devolvio la url del archivo')) {
    codigo = CODIGOS.UPLOAD_FAILED;
  }

  const e = new ErrorVideo(codigo, msg, { ...contexto, causa: error });
  return e;
}

/** Envoltorio corto para las rutas API: status HTTP segun el codigo. */
export function statusHttp(codigo) {
  if (codigo === CODIGOS.INSUFFICIENT_CREDITS) return 402;
  if (codigo === CODIGOS.NO_SCRIPT) return 400;
  if (codigo === CODIGOS.TIMEOUT) return 504;
  return 502;
}
