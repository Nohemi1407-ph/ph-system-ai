# PH System AI — TikTok Shop Engine

Un producto + un avatar → videos con estructura de venta, listos para subir a
TikTok Shop.

Una sola vista: `/tiktok`. La raíz redirige ahí.

## Cómo funciona

1. **Ficha forense del producto** — lee la foto y extrae su identidad exacta
   (texto literal de la etiqueta, colores con hex, material, cierre,
   proporciones). Lo que no puede leer lo declara en vez de inventarlo.
2. **Guion con la estructura del cliente** — beats, familias de hook,
   estrategias y reglas de compliance salen de la base de conocimiento
   (`lib/tiktok/knowledge.js`), ampliable con los PDFs del cliente.
3. **Video** — clips encadenados con arco narrativo, catálogo de cámara y
   sistema de diseño bloqueado entre tomas.
4. **Verificación** — cada clip se compara contra la foto original del
   producto; si cambió, se rehace.

El detalle del sistema de video está en [docs/SISTEMA_DE_VIDEO.md](docs/SISTEMA_DE_VIDEO.md).

## Variables de entorno

| Variable | Para qué |
|---|---|
| `KIE_API_KEY` | Generación de video (Veo 3.1) y, si responde, también texto. |
| `ANTHROPIC_API_KEY` | Motor de texto. Sirve como respaldo automático de Kie. |
| `OPENAI_API_KEY` | Otro respaldo de texto (opcional). |
| `LLM_PROVIDER` | Cuál se intenta primero: `kie` \| `anthropic` \| `openai`. |
| `LLM_MODEL` | Fuerza el modelo del proveedor principal (opcional). |
| `PH_CONCURRENCIA` | Videos en paralelo por lote. Por defecto `3`. |
| `PH_VERIFICAR_FIDELIDAD` | `false` desactiva la verificación del producto. |
| `PH_DATA_DIR` | Dónde se guardan los jobs. Por defecto `.data`. |

Basta con que **uno** de los proveedores de texto responda: si el principal
falla, se pasa al siguiente solo.

## Desarrollo

```bash
npm install
npm run dev
```
