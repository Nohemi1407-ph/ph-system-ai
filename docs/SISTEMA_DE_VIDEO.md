# Sistema de video — estructura adoptada

Estructura tomada de [`VIDEO_AGENT_SYSTEM_PROMPT.md`](https://github.com/Nohemi1407-ph/agent-design/blob/main/docs/VIDEO_AGENT_SYSTEM_PROMPT.md)
(repo `agent-design`) y adaptada a lo que este proyecto ya hacía: un avatar real
+ un producto real, clips de Veo encadenados, y venta en TikTok Shop.

## La diferencia de fondo con el documento original

En el documento, la referencia es un **lenguaje visual** que se copia mientras el
**sujeto se reinterpreta** en cada shot ("mismo universo, otra escena").

Aquí es al revés en un punto crítico: la referencia es **la cara del avatar y el
producto del cliente**. Se copian literal, nunca se reinterpretan — cambiar la
cara o el empaque entre tomas es la causa número uno de rechazo del cliente. Lo
que sí se reinterpreta por shot es la **escena**: acción, encuadre, momento del
beat de venta.

Todo lo demás del documento se adoptó tal cual.

## Qué se adoptó y dónde vive

| Idea del documento | Dónde está ahora |
|---|---|
| Arco narrativo según N shots (el último SIEMPRE es CTA) | `lib/tiktok/shotSystem.js` → `arcoNarrativo()` |
| Catálogo de movimientos de cámara, sin repetir dos seguidos | `shotSystem.js` → `CATALOGO_MOVIMIENTOS`, `planMovimientos()` |
| Sistema de diseño bloqueado (lo que NO cambia entre tomas) | `shotSystem.js` → `construirSistemaDeDiseno()`, `bloqueSistema()` |
| Chequeo de consistencia por shot, regenerar si rompe | `shotSystem.js` → `validarConsistencia()` + `repararGuion()` en `longform.js` |
| Pre-vuelo de créditos (402 antes de empezar) | `lib/tiktok/creditos.js` → `verificarSaldo()` |
| Códigos de error estructurados + taskId recuperable | `lib/tiktok/errors.js` |
| Generación en paralelo (batch) | `lib/tiktok/pipeline.js` → `enParalelo()`, `PH_CONCURRENCIA` |
| Caché de referencias subidas (subir una vez, reusar) | `lib/tiktok/refCache.js` |
| Sondeo adaptativo (rápido al principio, espaciado después) | `lib/tiktok/providers/kie.js` → `intervaloAdaptativo()` |
| Post-producción: unir, portada, caption + hashtags | `lib/tiktok/media.js`, `lib/tiktok/postproduccion.js` |
| Nunca inventar conversión a dólares | `creditos.js` → se reporta el crédito que devuelve la API |

## Fidelidad del producto — por qué se rediseñaba

Este era el fallo de fondo, y no era del modelo: era nuestro.

Al modelo de video se le mandaban 2 o 3 imágenes **sin decirle cuál era cuál**, y
una descripción del producto de una línea, del tipo `"a blue skincare bottle"`.
Con eso, Veo tiene permiso para inventar la etiqueta, la tapa, las proporciones y
hasta la marca. No estaba fallando: le estábamos dando libertad.

Cuatro cambios, en orden de impacto:

**1. Ficha forense** (`lib/tiktok/producto.js` → `fichaForense`). La foto se lee
con detalle de perito: texto literal de la etiqueta, colores con hex, material,
acabado, cierre, proporciones, marcas distintivas. Y lo que **no** se puede leer
se declara en `falta_contexto` en vez de inventarse.

Antes → `a blue skincare bottle`
Ahora → `opaque plastic pump bottle, main color matte sage green #8FA98A, matte
soft-touch plastic, tall cylinder with rounded shoulders, closure: white ribbed
pump, height of an adult palm, brand mark reads "LUMEA", label text reads exactly:
"GLOW SERUM" / "Vitamin C 20%", distinctive details: thin gold stripe at the base`

**2. Índices de imagen declarados** (`armarReferencias` + `bloqueFidelidad`). Cada
prompt empieza diciendo `IMAGE 1 = the person; IMAGE 2 = previous clip's last
frame (continuity only); IMAGE 3 = the product`. El array de imágenes y el mapa de
índices se construyen **juntos**, así que nunca se desalinean: antes, con
`[avatar, frame, producto].filter(Boolean)`, si faltaba una imagen todo lo de
detrás se corría de posición y el modelo trataba como producto lo que no lo era.

También se le dice explícitamente que el frame anterior sirve para continuidad de
pose, **no** como referencia del producto: ese fotograma ya viene degradado, y
copiar de una copia es como se acumula la deriva clip a clip.

**3. Identidad canónica repetida literal.** La misma cadena, calculada una vez, se
inyecta en todos los shots del video y en todos los videos del lote. Si se
recalculara por shot, cada shot saldría distinto.

**4. Verificación real, no confianza** (`verificarFidelidad`). Después de generar
cada clip se extrae un fotograma del centro y se compara contra la foto original.
Si el producto cambió de verdad (otro color, otra tapa, otra etiqueta, texto
inventado), el clip **se rehace una vez** con la corrección concreta. Diferencias
de ángulo, luz o encaje no cuentan como fallo, y ante la duda se da por bueno: es
preferible dejar pasar un clip dudoso que cobrarle al cliente dos veces por uno
que ya estaba bien.

Cuesta una llamada de visión (céntimos) frente a un clip de video (dólares).
El intento descartado se suma al costo reportado: el cliente ve lo que gastó de
verdad.

## Contexto del producto cuando la foto no alcanza

Si la foto no deja leer qué es el producto, el sistema **lo dice** en vez de
inventar. La UI analiza la foto en cuanto se sube (`POST /api/tiktok/producto`) y:

- si identificó el producto, muestra en un desplegable la cadena exacta que se le
  va a mandar al modelo, para poder corregirla antes de gastar;
- si no lo identificó, avisa en ámbar y lista qué le faltó.

Los campos de contexto (nombre, qué es, beneficio, marca, texto de etiqueta,
notas) se prellenan con lo que la visión dedujo y son editables. **Lo que escribe
el vendedor siempre gana** sobre lo que dedujo la IA: él conoce su producto, la
visión solo lo está mirando.

## Arco narrativo por número de shots

```
N=1  hero (todo en un plano)
N=2  hook · cta
N=3  hook · demostración · cta
N=4  hook · problema · solución · cta
N=5  hook · problema · solución · demostración · cta
N=6+ hook · problema · solución · [insight/demostración…] · transformación · cta
```

El último shot es siempre el CTA al **carrito naranja de TikTok Shop**. Sin
excepciones.

## Catálogo de cámara

`open_push_in`, `orbital`, `handheld_reveal`, `locked_static`, `whip_pan`,
`top_down_reveal`, `low_angle_hero`, `close_up_locked`.

Reglas: el shot 1 abre con `open_push_in`, el último cierra con
`close_up_locked`, y nunca dos shots seguidos usan el mismo movimiento.

## Sistema de diseño bloqueado

Se declara una vez y se repite **literal** en cada prompt:

- descripción fija del avatar (character lock)
- descripción fija del producto (mismo color, etiqueta, forma, empaque)
- entorno e iluminación
- acabado (UGC de celular, luz natural imperfecta)
- ritmo

Solo varían por shot: la acción, el encuadre, el movimiento de cámara y el
diálogo. Eso es lo que hace que 5 clips parezcan **un** video y no cinco.

## Códigos de error

`INSUFFICIENT_CREDITS` · `TIMEOUT` · `FILTERED` · `DOWNLOAD_FAILED` ·
`UPLOAD_FAILED` · `STITCH_FAILED` · `NO_SCRIPT` · `PROVIDER_ERROR` ·
`CONSISTENCY`

Cada error viaja con `codigo`, `mensaje`, `sugerencia` y — cuando existe —
`taskId`. Si Kie ya cobró y el video se perdió, el `taskId` es lo único que
permite recuperarlo.

Las rutas devuelven **402** cuando el saldo no alcanza para el trabajo completo:
mejor no empezar que dejar un lote a medias con los créditos ya gastados.

## Variables de entorno nuevas

| Variable | Default | Para qué |
|---|---|---|
| `PH_CONCURRENCIA` | `3` | Videos en paralelo por lote. Súbela si el proveedor aguanta, bájala a `1` si aparecen errores de rate limit. |
| `PH_VERIFICAR_FIDELIDAD` | `true` | Comprobar cada clip contra la foto del producto y rehacerlo si cambió. Ponla en `false` para desactivarlo (más barato y más rápido, pero sin garantía de fidelidad). |

## Interruptores que ya existían y siguen ahí

- `PROMPT_EN_JSON` (`lib/tiktok/longform.js`): el prompt se manda a Kie como
  JSON estructurado. Ponlo en `false` para volver a la oración plana en inglés.
