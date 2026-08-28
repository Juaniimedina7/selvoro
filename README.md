# Selvoro

Analista de inteligencia de mercado para e-commerce (Argentina/LATAM). Ingresás un
producto y Selvoro devuelve un reporte con scoring explicable y una recomendación:
**testear · investigar · descartar**.

> Slice 1 (este repo): **validar un producto para Argentina** con Mercado Libre +
> Google Trends + scoring + reporte generado por IA. Los anuncios activos
> (Meta Ad Library / TikTok) llegan en fase 2. Ver el plan completo en
> `~/.claude/plans/idempotent-hugging-iverson.md`.

## Stack

- **Next.js 15** (App Router, TypeScript) — web + API en un solo proyecto.
- **Anthropic / Claude** (`claude-opus-4-8`) para la redacción del reporte, detrás
  de una capa de abstracción (`src/lib/llm/client.ts`).
- Sin base de datos todavía: el análisis es on-demand (flujo A).

## Arquitectura (API-first)

La lógica vive en `src/lib` y es agnóstica de la UI (la web y, en fase 2, el MCP,
son clientes delgados):

```
src/lib/
  collectors/mercadolibre.ts   # API oficial de ML, degrada con gracia
  collectors/trends.ts         # Google Trends (no oficial, best-effort)
  scoring/engine.ts            # scoring explicable por dimensión (bandas + confianza)
  report/generate.ts           # narrativa con LLM, grounded en evidencia
  llm/client.ts                # abstracción del proveedor de IA
  pipeline.ts                  # orquesta: collect -> score -> narrativa -> reporte
  types.ts                     # modelo de dominio
src/app/api/analyze/route.ts   # POST /api/analyze (endpoint interno)
src/app/page.tsx               # UI del flujo A
```

## Setup

```bash
cp .env.example .env.local
# Completá ANTHROPIC_API_KEY (requerido). ML_ACCESS_TOKEN es opcional.
npm install
npm run dev
```

Abrí http://localhost:3000.

## Notas de datos (honestas)

- **Mercado Libre**: usa la API oficial. Si ML exige autenticación y no hay
  `ML_ACCESS_TOKEN`, el collector **degrada con gracia** (marca la fuente como no
  disponible y baja la confianza) en vez de romper.
- **Google Trends**: no hay API oficial; usamos el flujo no oficial (frágil por
  diseño). Si falla, el reporte sigue con menor confianza.
- El scoring es una **estimación explicable**, nunca una métrica de ventas/ROAS real.

## Próximos pasos (del plan)

1. Registrar app de Mercado Libre y completar `ML_ACCESS_TOKEN`.
2. Spike de datos de Meta Ad Library AR (decisión go/no-go).
3. Agregar auth + créditos (E5) y comparación US↔AR (E6).
4. Exponer el MCP como cliente de esta misma API (fase 2).
