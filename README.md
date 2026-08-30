# Selvoro

Analista de inteligencia de mercado para e-commerce (Argentina/LATAM). Ingresás un
producto y Selvoro devuelve un reporte con scoring explicable y una recomendación:
**testear · investigar · descartar**.

> **Validar un producto para Argentina** con Mercado Libre + Google Trends + Meta
> Ad Library + scoring + reporte generado por IA, detrás de auth (Clerk) y
> suscripción mensual (Mercado Pago) — con un **agente de chat** y un **servidor
> MCP remoto** exponiendo las mismas capacidades (`analyze_product`,
> `search_products`, `compare_markets`, `generate_test_brief`, `get_report`,
> `list_reports`, `list_sources`), y credenciales de integraciones de datos
> cargadas por usuario (BYOK, `/dashboard/settings`). TikTok Creative Center
> queda para una fase futura (sin API oficial). Ver el plan completo en
> `~/.claude/plans/genera-un-plan-para-atomic-crystal.md`.

## Stack

- **Next.js 15** (App Router, TypeScript) — web + API en un solo proyecto.
- **Anthropic / Claude** (`claude-opus-4-8`) para la redacción del reporte, detrás
  de una capa de abstracción (`src/lib/llm/client.ts`).
- **Clerk** para autenticación (email/password + Google OAuth).
- **Postgres + Prisma** para estado de negocio (planes, suscripciones, créditos,
  historial de reportes). La identidad del usuario vive en Clerk; las tablas
  locales referencian usuarios por `clerkUserId`, sin tabla `User` propia.
- **Mercado Pago** (suscripciones/Preapproval) para billing recurrente mensual.
- **Tool Runner de Anthropic** (`client.beta.messages.toolRunner` + `betaZodTool`)
  para el agente de chat, y **`mcp-handler` + `@clerk/mcp-tools`** (auth OAuth
  de Clerk nativa para MCP) para el servidor MCP remoto.

## Arquitectura (API-first)

La lógica vive en `src/lib` y es agnóstica de la UI (la web y, en fase 2, el MCP,
son clientes delgados):

```
src/lib/
  collectors/mercadolibre.ts   # API oficial de ML, degrada con gracia
  collectors/trends.ts         # Google Trends (no oficial, best-effort)
  collectors/meta-ads.ts       # Meta Ad Library, degrada con gracia
  scoring/engine.ts            # scoring explicable por dimensión (bandas + confianza)
  report/generate.ts           # narrativa con LLM, grounded en evidencia
  llm/client.ts                # abstracción del proveedor de IA
  pipeline.ts                  # orquesta: collect -> score -> narrativa -> reporte
  types.ts                     # modelo de dominio
  db/prisma.ts                 # singleton de Prisma (driver adapter pg)
  billing/                     # planes, suscripciones, créditos, Mercado Pago
  reports/                     # persistencia y consulta de reportes por usuario
  discovery/searchProducts.ts  # search_products: brainstorm LLM + fan-out de runAnalysis
  agent/tools.ts               # definición única de las 7 tools (chat + MCP)
  agent/chat.ts                # arma el Tool Runner para el chat web
  credentials/                 # credenciales de integraciones cargadas por el usuario (BYOK)
src/app/api/analyze/route.ts       # POST /api/analyze (requiere sesión + créditos)
src/app/api/billing/                # alta/cancelación de suscripción
src/app/api/webhooks/mercadopago/  # webhook de Mercado Pago (preapproval + cobros)
src/app/api/cron/reconcile-subscriptions/  # red de seguridad diaria (Vercel Cron)
src/app/api/chat/route.ts          # agente conversacional (streaming)
src/app/api/[transport]/route.ts   # servidor MCP remoto (endpoint público: /api/mcp)
src/app/api/settings/credentials/  # CRUD de credenciales de integraciones (BYOK)
src/app/.well-known/               # metadata OAuth para clientes MCP (RFC 9728/8414)
src/app/page.tsx, pricing/, dashboard/, dashboard/chat/, dashboard/settings/  # UI
```

## Setup

```bash
cp .env.example .env.local
npm install
```

Completá en `.env.local`:

- `ANTHROPIC_API_KEY` (requerido, para el reporte — es nuestra, no la carga el
  usuario: ver sección de credenciales BYOK más abajo sobre qué sí es por usuario).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (requerido para auth —
  https://dashboard.clerk.com).
- `DATABASE_URL` / `DIRECT_URL` / `SHADOW_DATABASE_URL` (requerido para
  créditos/billing/historial/credenciales — cualquier Postgres sirve; Neon es
  gratis y sin setup. `SHADOW_DATABASE_URL` es una DB VACÍA Y DISTINTA de las
  otras dos, dedicada para que `prisma migrate dev` pueda diffear — con Neon,
  creá otra DB en el mismo proyecto, ej. `CREATE DATABASE prisma_shadow;`).
- `CREDENTIALS_ENCRYPTION_KEY` (requerido para BYOK — `openssl rand -base64 32`).
- `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` (requerido para suscripciones — usá
  credenciales de sandbox de Mercado Pago mientras desarrollás).
- `ML_ACCESS_TOKEN` (opcional, server-side, degrada con gracia).
- `META_ADS_ACCESS_TOKEN` **ya no existe como env var** — cada usuario carga su
  propio token desde `/dashboard/settings` (ver sección BYOK más abajo).

Con la DB configurada:

```bash
npm run db:migrate   # crea las tablas
npm run db:seed      # siembra los 3 planes (starter/pro/agencia)
```

```bash
npm run dev
```

Abrí http://localhost:3000.

## Notas de datos (honestas)

- **Mercado Libre**: usa la API oficial. Si ML exige autenticación y no hay
  `ML_ACCESS_TOKEN`, el collector **degrada con gracia** (marca la fuente como no
  disponible y baja la confianza) en vez de romper.
- **Google Trends**: no hay API oficial; usamos el flujo no oficial (frágil por
  diseño). Si falla, el reporte sigue con menor confianza.
- **Meta Ad Library**: API oficial gratuita, pero requiere App Review + verificación
  de negocio de Meta (puede tardar). El token es **BYOK** (por usuario, ver abajo):
  sin que el usuario cargue el suyo en `/dashboard/settings`, degrada con gracia
  igual que Mercado Libre.
- El scoring es una **estimación explicable**, nunca una métrica de ventas/ROAS real.

## Credenciales por usuario (BYOK)

Las integraciones de **datos** (no las de IA) se cargan por usuario desde
`/dashboard/settings`, no como env var compartida — cada uno analiza con sus
propias cuentas. Hoy la única es **Meta Ad Library**. `ML_ACCESS_TOKEN` queda
excluido a propósito (sigue siendo server-side, compartido) y
`ANTHROPIC_API_KEY` también (es de IA, no de integraciones de datos — el
sistema de créditos/planes no se ve afectado por esto).

- `src/lib/credentials/crypto.ts` — AES-256-GCM con `CREDENTIALS_ENCRYPTION_KEY`.
  Nunca se guarda un token en texto plano.
- `src/lib/credentials/providers.ts` — registro **extensible**: sumar una
  integración nueva es una entrada de código (`CREDENTIAL_PROVIDERS`), no una
  migración de schema (la tabla `UserCredential` es genérica: `provider` es
  `String` libre, `encryptedValue` es un JSON cifrado de forma libre).
- `src/lib/credentials/store.ts` — `get/set/delete/listUserCredentialStatus`.
  `setUserCredential` valida contra `provider.verify()` (una consulta real a
  la API del proveedor) **antes** de guardar — nunca persiste un token roto
  sin avisar.
- El token del usuario se resuelve en `gatherEvidence()`
  (`src/lib/pipeline.ts`) y se pasa a `collectMetaAds(query, accessToken)` —
  el collector ya no lee ningún env var. `list_sources` (chat/MCP) también
  refleja el estado *del usuario que pregunta* para Meta, mezclado con el
  estado del servidor para Mercado Libre — dos niveles distintos, documentado
  en la descripción de esa tool para no confundir al agente que la llama.

## Billing

Suscripción mensual vía Mercado Pago (Preapproval). Los créditos se resetean cada
ciclo (no acumulables). El webhook (`/api/webhooks/mercadopago`) valida la firma
HMAC y siempre re-consulta el recurso a Mercado Pago antes de mutar estado local
— nunca confía en el payload del POST. Ver `src/lib/billing/` y el plan completo
para el detalle de flujos (alta, renovación, cancelación, fallo de pago).

## Agente de chat y servidor MCP

Ambas superficies comparten una única definición de tools en
`src/lib/agent/tools.ts` (7 tools: `analyze_product`, `get_report`,
`list_reports`, `list_sources`, `compare_markets`, `generate_test_brief`,
`search_products`). Sin gating de créditos por ahora — decisión de producto,
ver riesgo de costo en el plan.

**Costo: evidencia cruda, no narrativa propia.** `analyze_product`,
`compare_markets` y cada candidato de `search_products` usan
`gatherEvidence()` (`src/lib/pipeline.ts`) — collectors + scoring
determinista, **sin llamar a Claude de nuestro lado**. El LLM que llama a la
tool (nuestro chat o el modelo del cliente MCP externo) ya tiene su propia
capacidad de síntesis y paga sus propios tokens; no tiene sentido pagar una
llamada nuestra por cada tool call. Cada dimensión del score ya trae un
`evidence` textual determinista (sin LLM) que alcanza como grounding. Solo el
formulario web (`/api/analyze`, vía `runAnalysis()`) sigue generando su propia
narrativa con Claude, porque ahí no hay ningún otro LLM río abajo que la
escriba. `get_report`/`generate_test_brief` siguen trabajando sobre reportes
YA persistidos (creados desde el formulario web, con narrativa) — los
análisis hechos desde el chat/MCP no se guardan.

- **Chat web** (`/dashboard/chat`): usa el Tool Runner de Anthropic
  (`client.beta.messages.toolRunner` + `betaZodTool`), streaming, atado al
  `clerkUserId` de la sesión. Tiene un **Task Budget** (`CHAT_TASK_BUDGET_TOKENS`,
  default 50.000) — techo de tokens por turno agéntico para que un turno con
  varias tool calls encadenadas no escale sin control.
- **MCP remoto** (`/api/mcp`, ruta física `src/app/api/[transport]/route.ts`
  con `basePath: "/api"`): usa `mcp-handler` v1 + `@clerk/mcp-tools` para
  autenticación OAuth nativa de Clerk — el cliente MCP (Claude Desktop,
  Claude.ai) completa el consentimiento de Clerk y las tools reciben el mismo
  `clerkUserId` que las rutas web, sin tabla de API keys propia. Requiere
  habilitar la app OAuth de MCP en el dashboard de Clerk (Configure →
  MCP/OAuth Applications) antes de poder conectar un cliente externo. Al no
  llamar a Claude de nuestro lado en la mayoría de las tools, el costo real de
  una sesión MCP es casi todo del cliente que se conecta, no nuestro.
- `search_products` es la única tool que sigue pagando una llamada nuestra:
  el paso de brainstorm (1 llamada) antes de correr collectors para cada
  candidato (hasta 8, sin narrativa por candidato).

**Nota de dependencias:** el ecosistema de MCP está en transición (SDK v1 →
v2). `@clerk/mcp-tools` todavía depende de `@modelcontextprotocol/sdk` v1, así
que el proyecto usa `mcp-handler` v1 (no la v2, que requiere el SDK v2) y fija
`@modelcontextprotocol/sdk` a una única versión compatible vía `overrides` en
`package.json` para evitar que convivan dos copias del SDK. Si en el futuro
`@clerk/mcp-tools` migra a v2, hay que revisar `mcp-handler` y el `overrides`
juntos.

## Próximos pasos

1. Conseguir credenciales reales (Clerk, Mercado Pago sandbox) y correr el
   flujo end-to-end, incluyendo el chat, una conexión MCP real y cargar un
   token de Meta Ad Library de prueba en `/dashboard/settings`.
2. Registrar app de Mercado Libre (server-side, sigue compartida) — Meta Ad
   Library ahora la registra cada usuario para sí mismo (App Review + business
   verification propios).
3. Definir gating de créditos para el chat (sigue pagando tokens nuestros por
   turno, acotados por el Task Budget) y para `search_products` (paga el
   brainstorm) antes de cualquier lanzamiento público — hoy corren sin límite
   de uso, solo con el techo de tokens por turno del chat como freno.
4. Habilitar la app OAuth de MCP en el dashboard de Clerk (Configure →
   MCP/OAuth Applications) para poder conectar un cliente MCP externo de verdad.
