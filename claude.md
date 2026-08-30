Quiero que actúes como Product Architect, Technical Lead y especialista en investigación de mercado para ayudarme a planear un producto SaaS orientado a e-commerce.

IMPORTANTE:
- Estás en Plan Mode.
- No escribas código todavía.
- No crees archivos ni modifiques el repositorio.
- Primero analizá el problema, cuestioná las hipótesis y proponé un plan realista.
- No des por ciertas métricas que técnicamente no puedan obtenerse.
- Diferenciá claramente datos reales, datos públicos, estimaciones y proxies.
- Si necesitás hacer supuestos, indicalos explícitamente.
- Priorizá un MVP construible por un desarrollador o equipo pequeño.
- Evitá diseñar una plataforma enorme desde el inicio.

## Contexto del proyecto

En Argentina y Latinoamérica está creciendo mucho el modelo de e-commerce de productos físicos y digitales.

Antes de lanzar un producto, los vendedores suelen hacer manualmente un análisis que incluye:

- Buscar productos que están vendiendo.
- Analizar anuncios activos de competidores.
- Revisar creatividades, hooks, ofertas, copies y formatos.
- Ver cuánto tiempo lleva activo un anuncio.
- Investigar tiendas y páginas de producto.
- Comparar precios.
- Analizar saturación.
- Buscar productos ganadores en otros países.
- Revisar si esos productos ya llegaron al mercado local.
- Analizar qué testean los competidores.
- Cruzar información entre Meta Ads Library, TikTok, tiendas, marketplaces y herramientas de espionaje publicitario.
- Decidir finalmente si conviene testear, investigar más o descartar un producto.

Hoy este trabajo está muy fragmentado. Los vendedores utilizan varias herramientas diferentes, por ejemplo:

- Minea.
- Adsparo.
- Espiad.
- Meta Ads Library.
- TikTok Creative Center.
- Marketplaces.
- Google Trends.
- Búsquedas manuales.
- Claude, ChatGPT u otros asistentes.
- Herramientas o skills específicas de investigación.

Una persona con mucha experiencia en e-commerce me confirmó que actualmente usa varias herramientas distintas para este proceso. Su impresión es que:

- Ya existen soluciones útiles.
- Hay mejores herramientas para infoproductos que para ciertos análisis de productos físicos.
- Muchas herramientas funcionan como galerías de anuncios u ofertas.
- Sigue existiendo fragmentación.
- Hay espacio para una solución más simple, integrada y orientada a decisiones.

## Idea del producto

El nombre provisional del producto es “Selvoro”.

Selvoro no debería ser solamente otra biblioteca de anuncios.

La visión es construir un analista o agente de inteligencia de mercado para e-commerce que ayude al usuario a decidir qué productos vale la pena testear.

La experiencia ideal sería que el usuario pueda realizar consultas como:

“Encontrame productos físicos para mujeres de 25 a 45 años, con un ticket de entre 30 y 80 dólares, que estén funcionando en Estados Unidos pero todavía no estén saturados en Argentina.”

O:

“Analizá este producto y decime si tiene sentido testearlo con Meta Ads en Argentina.”

O:

“Buscá cinco productos de hogar que estén creciendo, tengan margen potencial, buenos ángulos publicitarios y poca competencia local.”

Selvoro podría analizar distintas señales y devolver:

- Competidores.
- Anuncios activos.
- Antigüedad de los anuncios.
- Repetición de creatividades o ángulos.
- Hooks.
- Promesas.
- Ofertas.
- Precios.
- Páginas de producto.
- Mercados donde se vende.
- Presencia en Argentina o Latinoamérica.
- Saturación estimada.
- Tendencia.
- Posibles márgenes.
- Dificultad logística.
- Riesgos.
- Oportunidades de diferenciación.
- Recomendación final.

La recomendación podría clasificarse como:

- Testear.
- Investigar más.
- Descartar.

## Restricción importante sobre las métricas

No debemos prometer acceso a métricas privadas de competidores como:

- ROAS real.
- CPA real.
- Conversion rate real.
- Ventas exactas.
- Rentabilidad real.
- Presupuesto exacto invertido.

Esos datos generalmente no son públicos.

En su lugar, el producto debería trabajar con señales observables y proxies, por ejemplo:

- Antigüedad del anuncio.
- Cantidad de variantes creativas.
- Frecuencia con la que se repite una oferta.
- Cantidad de mercados donde aparece.
- Tráfico estimado.
- Engagement.
- Tendencias de búsqueda.
- Posición en marketplaces.
- Cantidad de competidores.
- Evolución de precios.
- Persistencia de una tienda o producto.
- Presencia en varias plataformas.
- Cantidad de anuncios activos relacionados.
- Señales de saturación local.

Una parte importante del producto podría ser desarrollar un sistema propio de scoring que combine estas señales.

Ese scoring no debería presentarse como una métrica real de ventas, sino como una estimación explicable.

## Diferenciación potencial

Una de las oportunidades principales podría ser Latinoamérica, especialmente Argentina.

Muchas herramientas se enfocan principalmente en Estados Unidos, Europa o dropshipping global.

Selvoro podría responder preguntas que otras herramientas no resuelven bien, por ejemplo:

- ¿Un producto ganador en Estados Unidos puede funcionar en Argentina?
- ¿Ya está saturado en Argentina?
- ¿Cuántos competidores locales existen?
- ¿Qué precio local podría tener?
- ¿Se puede importar?
- ¿Cuál sería el costo aproximado?
- ¿Existen restricciones de envío o aduana?
- ¿Se vende en Mercado Libre?
- ¿Qué diferencias culturales o económicas afectan la oferta?
- ¿Qué medios de pago y cuotas existen?
- ¿Qué tan difícil sería entregar el producto?
- ¿El ticket es compatible con el poder adquisitivo local?
- ¿Conviene importarlo, fabricarlo o buscar un proveedor local?

## Hipótesis de MVP

El usuario ingresaría:

- País o mercado donde quiere vender.
- Producto o nicho.
- Tipo de producto: físico o digital.
- Ticket deseado.
- Canal publicitario.
- Presupuesto aproximado.
- Público objetivo.
- Restricciones opcionales.

El sistema devolvería un reporte con:

1. Resumen ejecutivo.
2. Competidores encontrados.
3. Anuncios y creatividades relevantes.
4. Hooks, ofertas y promesas.
5. Precios.
6. Antigüedad y persistencia de anuncios.
7. Saturación estimada.
8. Señales positivas.
9. Señales negativas.
10. Riesgos.
11. Posibles diferenciadores.
12. Ideas de testeo.
13. Nivel de confianza del análisis.
14. Fuentes utilizadas.
15. Recomendación final:
   - Testear.
   - Investigar más.
   - Descartar.

## Posible arquitectura del producto

Inicialmente pensé en construirlo como MCP para que pueda ser utilizado desde:

- Claude.
- ChatGPT.
- Gemini.
- Otros agentes o clientes compatibles.

Sin embargo, no quiero asumir que MCP sea necesariamente el producto principal.

Necesito que evalúes si conviene:

- Crear primero una aplicación web.
- Crear primero una API.
- Crear primero un MCP.
- Crear una API y que el MCP sea solamente un cliente.
- Crear una aplicación web más MCP.
- Construir un sistema de agentes internos.
- Utilizar workflows deterministas en lugar de agentes para ciertas tareas.

La arquitectura debería evitar depender completamente de un solo proveedor de IA.

## Fuentes de información posibles

Analizá la viabilidad, disponibilidad, costo y limitaciones legales o técnicas de fuentes como:

- Meta Ads Library.
- Meta Ad Library API, si corresponde.
- TikTok Creative Center.
- Google Trends.
- Google Search.
- Mercado Libre.
- Amazon.
- AliExpress.
- Shopify stores.
- Similarweb u otras fuentes de tráfico.
- BuiltWith.
- Redes sociales.
- Marketplaces regionales.
- Proveedores.
- Datos de importación.
- APIs comerciales.
- Scraping, cuando sea legal y razonable.
- Datos aportados por usuarios.
- Integraciones con cuentas publicitarias propias del usuario.

No asumas que una fuente tiene API pública. Verificá conceptualmente qué fuentes probablemente requerirían:

- API oficial.
- Scraping.
- Proveedor de datos externo.
- Browser automation.
- Carga manual.
- Integración autenticada del usuario.

## Lo que necesito de vos

Quiero que produzcas un plan completo, crítico y priorizado.

### 1. Reformulación del problema

Explicá:

- Qué problema concreto resuelve Selvoro.
- Para quién.
- Qué decisión ayuda a tomar.
- Qué parte del proceso actual reemplaza o acelera.
- Qué no debería intentar resolver.

### 2. Usuarios objetivo

Definí posibles perfiles:

- Principiante de e-commerce.
- Media buyer.
- Dueño de tienda.
- Agencia.
- Infoproductor.
- Dropshipper.
- Marca de productos físicos.
- Consultor.

Recomendá cuál debería ser el usuario inicial del MVP y por qué.

### 3. Jobs to be Done

Definí los principales trabajos que el usuario quiere realizar.

Ejemplos:

- Encontrar productos para testear.
- Validar un producto específico.
- Analizar competidores.
- Entender por qué una oferta funciona.
- Detectar saturación.
- Adaptar un producto extranjero a Argentina.
- Generar un brief de testeo publicitario.

### 4. Competencia y alternativas

Clasificá la competencia por categorías:

- Ad libraries.
- Product research tools.
- Spy tools.
- Trend discovery.
- Market intelligence.
- AI research agents.
- Marketplaces.
- Procesos manuales.

Explicá dónde competiría Selvoro y dónde no.

No inventes datos específicos sobre competidores que no puedas verificar. Cuando falte información, indicá qué habría que investigar.

### 5. Propuesta de valor

Proponé:

- Una propuesta de valor principal.
- Tres variantes de posicionamiento.
- El mensaje más claro para la landing page.
- Un tagline.
- Qué promesas serían creíbles.
- Qué promesas deberían evitarse.

### 6. Alcance del MVP

Definí con precisión:

- Qué incluye.
- Qué no incluye.
- Qué fuentes utilizaría.
- Qué tareas serían automáticas.
- Qué tareas podrían ser semiautomáticas.
- Qué partes podrían comenzar con datos limitados.
- Qué podría simularse manualmente durante la validación.

Priorizá funcionalidad usando:

- Must have.
- Should have.
- Could have.
- Won’t have yet.

### 7. Flujos principales

Diseñá los flujos:

A. Validar un producto específico.  
B. Descubrir productos potenciales.  
C. Analizar un competidor.  
D. Comparar un producto entre Estados Unidos y Argentina.  
E. Generar un brief de testeo.

Para cada flujo, indicá:

- Input.
- Fuentes consultadas.
- Procesamiento.
- Output.
- Posibles errores.
- Nivel de confianza.

### 8. Sistema de scoring

Proponé un scoring explicable.

El sistema debería separar dimensiones, por ejemplo:

- Demanda.
- Competencia.
- Saturación.
- Persistencia publicitaria.
- Oportunidad local.
- Margen potencial.
- Logística.
- Diferenciación.
- Riesgo.

Para cada dimensión, indicá:

- Señales utilizadas.
- Peso inicial sugerido.
- Limitaciones.
- Cómo mostrar la explicación al usuario.
- Cómo evitar falsa precisión.

Evaluá si conviene dar:

- Un puntaje único.
- Varios subpuntajes.
- Una recomendación cualitativa.
- Una combinación de los anteriores.

### 9. Arquitectura técnica

Proponé una arquitectura inicial incluyendo:

- Frontend.
- Backend.
- Base de datos.
- Jobs asíncronos.
- Cola de tareas.
- Crawlers o collectors.
- Almacenamiento de anuncios y creatividades.
- Normalización de datos.
- Deduplicación.
- Motor de scoring.
- Uso de LLMs.
- Observabilidad.
- Caching.
- Rate limits.
- Manejo de costos.
- Seguridad.
- Autenticación.
- Multi-tenancy.

Evaluá específicamente:

- Aplicación web.
- API.
- MCP server.
- Uso de MCP como interfaz secundaria.
- Integraciones futuras.

La arquitectura debe ser posible para un MVP, no una infraestructura de escala empresarial prematura.

### 10. MCP

Analizá qué herramientas debería exponer un MCP de Selvoro.

Por ejemplo:

- search_products
- analyze_product
- search_ads
- analyze_competitor
- compare_markets
- estimate_saturation
- generate_test_brief
- get_report
- list_sources

Para cada tool sugerida, indicá:

- Objetivo.
- Parámetros.
- Respuesta.
- Si es síncrona o asíncrona.
- Qué datos necesita.
- Riesgos de abuso o costo.

También indicá qué lógica debería vivir en la API y no directamente en el MCP.

### 11. Modelo de datos

Proponé las entidades principales, como:

- Product.
- ProductVariant.
- Market.
- Competitor.
- Store.
- Advertisement.
- Creative.
- Offer.
- PriceObservation.
- TrendObservation.
- MarketplaceListing.
- ResearchRun.
- DataSource.
- Signal.
- Score.
- Recommendation.
- Report.
- User.
- Workspace.

Indicá relaciones y qué campos serían esenciales en el MVP.

### 12. Riesgos

Analizá:

- Dependencia de scraping.
- Cambios en plataformas.
- Bloqueos.
- Datos incompletos.
- Métricas engañosas.
- Costos de proveedores.
- Alucinaciones de LLMs.
- Riesgos legales.
- Privacidad.
- Copyright de creatividades.
- Cumplimiento de términos de servicio.
- Complejidad de mantener datos frescos.
- Dificultad para probar que una recomendación es buena.

Para cada riesgo, proponé mitigaciones.

### 13. Validación antes de construir

Diseñá un proceso de validación con usuarios reales.

Incluí:

- Entrevistas.
- Observación de pantalla.
- Concierge MVP.
- Reportes hechos manualmente.
- Landing page.
- Lista de espera.
- Prueba de disposición a pagar.
- Métricas de validación.
- Preguntas concretas para entrevistar a especialistas en e-commerce.

Quiero especialmente aprovechar a una amiga con mucha experiencia en e-commerce.

Diseñá una entrevista de 30 a 45 minutos con ella para observar:

- Qué herramientas usa.
- En qué orden.
- Qué información busca.
- Qué copia manualmente.
- Qué conclusiones extrae.
- Qué parte del proceso le lleva más tiempo.
- Qué resultados no obtiene hoy.
- Por qué paga por ciertas herramientas.
- Qué herramienta dejaría de pagar si Selvoro funcionara.

### 14. Estrategia de datos

Definí una estrategia progresiva:

Fase 1:
- Datos públicos.
- Búsquedas en tiempo real.
- Reportes manuales o semiautomáticos.

Fase 2:
- Base propia.
- Historial.
- Tracking de cambios.
- Deduplicación.
- Scoring mejorado.

Fase 3:
- Datos de usuarios.
- Integración con cuentas propias.
- Feedback de performance.
- Modelos de predicción.

Explicá cómo podría construirse un moat de datos sin necesitar una base gigantesca desde el primer día.

### 15. Monetización

Proponé modelos posibles:

- Suscripción.
- Créditos por análisis.
- Plan freemium.
- Plan para agencias.
- API.
- MCP premium.
- Reportes individuales.
- Integraciones.

Recomendá uno para validar inicialmente.

### 16. Roadmap

Creá un roadmap dividido en:

- Validación.
- Prototipo.
- MVP.
- Beta privada.
- Primera versión paga.
- Expansión.

Para cada etapa incluí:

- Objetivo.
- Funcionalidades.
- Dependencias.
- Riesgos.
- Criterio de éxito.

### 17. Backlog inicial

Generá un backlog ordenado con:

- Épicas.
- Historias de usuario.
- Tareas técnicas.
- Prioridad.
- Dependencias.
- Criterios de aceptación.

No conviertas todavía esto en código.

### 18. Decisiones abiertas

Terminá con una lista de las decisiones que todavía necesito tomar.

Separalas en:

- Decisiones de producto.
- Decisiones técnicas.
- Decisiones de datos.
- Decisiones comerciales.
- Decisiones legales.

### 19. Recomendación final

Quiero una recomendación honesta sobre:

- Si vale la pena construirlo.
- Qué versión exacta construir primero.
- Qué debería validar antes de programar.
- Qué evitar.
- Cuál es el riesgo más grande.
- Cuál podría ser la ventaja competitiva más fuerte.
- Qué harías durante los próximos 30 días.

## Formato de la respuesta

Organizá el resultado así:

1. Resumen ejecutivo.
2. Diagnóstico del problema.
3. Usuario inicial recomendado.
4. Propuesta de valor.
5. Competencia y diferenciación.
6. MVP recomendado.
7. Flujos principales.
8. Fuentes de datos.
9. Sistema de scoring.
10. Arquitectura técnica.
11. Diseño del MCP.
12. Modelo de datos.
13. Riesgos.
14. Plan de validación.
15. Monetización.
16. Roadmap.
17. Backlog.
18. Decisiones abiertas.
19. Plan de acción de 30 días.

En cada sección:

- Sé específico.
- Marcá supuestos.
- Indicá nivel de confianza.
- Separá hechos de hipótesis.
- Señalá qué requiere investigación adicional.
- Priorizá simplicidad y velocidad de validación.

Antes de presentar el plan final, haceme únicamente las preguntas realmente críticas cuya respuesta pueda cambiar de forma importante el MVP o la arquitectura.
No hagas preguntas que puedan resolverse proponiendo un supuesto razonable.

---

## Estado de implementación (post-planeamiento)

Lo de arriba fue el brief original de planeamiento. Esta sección documenta qué
se construyó después, sobre el slice 1 (Mercado Libre + Trends + scoring +
reporte LLM). Plan completo de esta etapa en
`~/.claude/plans/genera-un-plan-para-atomic-crystal.md`.

### Fase A — Meta Ad Library + scoring real

- Nuevo collector `src/lib/collectors/meta-ads.ts`: consulta `/ads_archive` de
  la Graph API en paralelo para AR y US, mismo patrón de degradación con
  gracia que `mercadolibre.ts`. Sin `META_ADS_ACCESS_TOKEN` configurado,
  degrada sin romper el pipeline (requiere App Review + verificación de
  negocio de Meta, todavía no gestionado).
- `evalPersistencia` (antes stub) y `evalSaturacion` en
  `src/lib/scoring/engine.ts` ahora usan datos reales de anuncios activos
  (antigüedad, anunciantes distintos) combinados con Mercado Libre.
- `evalDiferenciacion`/`evalRiesgo` siguen siendo cualitativos a propósito
  (no hay forma honesta de convertir esos datos en un score sin falsear
  precisión).
- TikTok Creative Center: **omitido** en esta fase (decisión explícita, no
  tiene API oficial).

### Fase B — Auth + DB

- **Auth: Clerk** (`@clerk/nextjs`), no NextAuth como se había planeado
  originalmente — decisión tomada a mitad de implementación porque Clerk da
  email/password + Google OAuth funcionando sin que haya que crear
  credenciales de Google Cloud de entrada. `middleware.ts` solo habilita
  detección de sesión; la protección es "resource-based" (`auth()`/
  `auth.protect()` en cada route handler/page), no por path-matching en
  middleware — Clerk deprecó `createRouteMatcher` por eso.
- **DB: Postgres vía Prisma 7** (`prisma/schema.prisma`, `prisma.config.ts`).
  Prisma 7 cambió la config: `datasource.url` ya no va en el schema, vive en
  `prisma.config.ts`, y `PrismaClient` necesita un driver adapter
  (`@prisma/adapter-pg`) — no hay engine embebido. Ver
  `src/lib/db/prisma.ts`.
- No hay tabla `User` local: la identidad vive en Clerk, las tablas de
  negocio (`Subscription`, `CreditLedger`, `Report`) referencian usuarios
  por `clerkUserId` (string).
- No se modeló `Workspace`/multi-tenancy real — el plan "Agencia" es solo un
  tier de más créditos, no un espacio compartido.

### Fase C — Billing (Mercado Pago)

- 3 planes (`src/lib/billing/plans.ts`, fuente de verdad única, sembrada en
  `prisma/seed.ts`): Starter $9.900/mes (10 análisis), Pro $24.900/mes (30),
  Agencia $59.900/mes (100). **Precios tentativos**, sin validar contra costo
  real de Claude Opus por análisis.
- Suscripción recurrente vía Mercado Pago **Preapproval**
  (`src/lib/billing/subscriptions.ts`), créditos que se resetean cada ciclo
  (no acumulables).
- Webhook (`src/app/api/webhooks/mercadopago/route.ts`) valida firma HMAC
  (`src/lib/billing/webhookVerify.ts`, manifest
  `id:{data.id};request-id:{x-request-id};ts:{ts};`) y maneja **dos topics**
  distintos de MP por separado: `subscription_preapproval` (alta/pausa/
  cancelación de la suscripción) y `subscription_authorized_payment` (cada
  cobro recurrente individual — acá es donde se resetean los créditos
  mensuales, vía el recurso `Invoice`/`authorized_payments`). Nunca confía en
  el payload del POST, siempre re-consulta el recurso a MP antes de mutar
  estado local.
- Débito de crédito atómico (`checkAndDebitCredit` en
  `src/lib/billing/credits.ts`) **antes** de correr el análisis, con refund
  automático si el análisis falla.
- Cron diario (`/api/cron/reconcile-subscriptions`, protegido por
  `CRON_SECRET`, configurado en `vercel.json`) como red de seguridad si un
  webhook no llega.
- Cancelación corta el acceso de inmediato — Mercado Pago Preapproval no
  soporta "cancelar al fin del período" como Stripe.

### Fase D — UI

`/pricing` (planes + alta de suscripción), `/dashboard` (plan actual,
créditos restantes, cancelar, historial de reportes), `/dashboard/reports/[id]`
(detalle, reusa `ReportView`), `/sign-in`, `/sign-up` (componentes de Clerk),
header global con estado de sesión. La landing (`/`) es Server Component:
sin sesión muestra marketing, con sesión muestra el formulario de análisis
(extraído a `src/components/AnalyzeForm.tsx`).

### Verificado en esta sesión

`tsc --noEmit` y `npm run build` pasan limpio de punta a punta. **No** se
probó el flujo end-to-end en navegador porque requiere credenciales reales
que solo el usuario puede generar (Clerk, un Postgres real, Mercado Pago
sandbox). Antes de asumir que algo funciona en runtime, correr:

```bash
cp .env.example .env.local   # completar ANTHROPIC_API_KEY, Clerk, DATABASE_URL/DIRECT_URL, MP_*
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Deuda técnica conocida (documentada, no bloqueante)

- Timeout duro de la función serverless durante el análisis puede dejar un
  crédito debitado sin reporte generado (el `catch` de refund no llega a
  correr). Solución de fondo: pasar `/api/analyze` a un flujo asíncrono con
  `run_id` (ya anticipado como fase 2 desde el código original).
- Una sola suscripción activa por usuario, sin upgrade/downgrade fluido.
- `input.query` puede ser una URL (AliExpress/tienda) y se pasa cruda a los
  tres collectors sin normalizar — problema preexistente, no introducido acá.

---

## Estado de implementación — agente de chat + servidor MCP

Segunda ronda de trabajo sobre este slice: el "agente para hablar" y las
herramientas MCP que el brief original imaginaba como fase 2. Plan completo
(mismo archivo que las fases A-D, reescrito para esta ronda) en
`~/.claude/plans/genera-un-plan-para-atomic-crystal.md`.

Decisiones del usuario para esta ronda: el set de tools completo del brief
(no solo lo ya construido), ambas superficies (chat web + MCP remoto), y
**sin gating de créditos por ahora** — riesgo de costo real y consciente,
sobre todo por `search_products` (~6 llamadas a Opus por invocación).

### Qué se construyó

- **`src/lib/agent/tools.ts`**: definición única de 8 tools (`analyze_product`,
  `get_report`, `list_reports`, `list_sources`, `compare_markets`,
  `analyze_competitor`, `generate_test_brief`, `search_products`), consumida
  por el chat y por el MCP sin duplicar lógica. `estimate_saturation` del
  brief no se expone aparte: ya es una dimensión del `score` existente.
- **Honestidad sobre qué es nuevo de verdad**: `analyze_competitor` es
  mayormente un alias de `analyze_product` (mismo pipeline, distinto framing
  de la narrativa vía el nuevo parámetro `framing` en
  `report/generate.ts`/`pipeline.ts`) — sin Similarweb/BuiltWith no hay
  señales de competidor distintas. `compare_markets` no agrega collectors: los
  campos AR/US de `TrendsData`/`MetaAdsData` ya existían, solo se re-proyectan
  (`report/compareMarkets.ts`). `search_products`
  (`discovery/searchProducts.ts`) es el único con una fuente de "datos" nueva
  real: un LLM brainstormea candidatos (ideación, sin datos), y cada uno pasa
  por `runAnalysis` completo — capado a 8 (`HARD_MAX_CANDIDATES`), default 5.
- **Chat web** (`/dashboard/chat`, `src/lib/agent/chat.ts`,
  `src/app/api/chat/route.ts`): Tool Runner de Anthropic
  (`client.beta.messages.toolRunner` + `betaZodTool`), streaming de texto
  plano al cliente. Historial de conversación NO se persiste (se resend desde
  el cliente cada turno) — mejora futura, no bloqueante.
- **Servidor MCP remoto** (`src/app/api/[transport]/route.ts`, endpoint
  público `/api/mcp` vía `basePath: "/api"` de `mcp-handler`): autenticado con
  `@clerk/mcp-tools` — `verifyClerkToken(auth({acceptsToken:"oauth_token"}),
  token)` devuelve `AuthInfo` con `extra.userId` = el `clerkUserId`, sin tabla
  de API keys propia. Requiere dos rutas de metadata OAuth
  (`src/app/.well-known/oauth-protected-resource/`,
  `.../oauth-authorization-server/`, vía helpers `*HandlerClerk` de
  `@clerk/mcp-tools/next`) y habilitar la app OAuth de MCP en el dashboard de
  Clerk (paso manual, no hay env var nueva).

### Decisión técnica no anticipada en el plan: mcp-handler v1, no v2

El plan original asumía `mcp-handler` v2 (zod v4, `createMcpHandler` de 1
argumento, `ctx.http.authInfo`). Al implementar se descubrió que
`@clerk/mcp-tools@0.6.0` todavía depende de `@modelcontextprotocol/sdk` **v1**
(`^1.29.0`), mientras que `mcp-handler` v2 requiere el SDK **v2**
(`@modelcontextprotocol/server`) — son paquetes distintos, sin
interoperabilidad. Se resolvió usando `mcp-handler@^1.1.0` (misma generación
de SDK que Clerk) en vez de v2, con estas implicancias:

- `createMcpHandler(initFn, serverOptions, config)` de 3 argumentos, ruta
  física en `src/app/api/[transport]/route.ts` con `config.basePath: "/api"`
  (no un `route.ts` fijo como en v2).
- Dentro de un tool handler, la identidad verificada llega como
  `extra.authInfo` (segundo parámetro del callback de `registerTool`), no
  `ctx.http?.authInfo` (eso es v2).
- `inputSchema` en `registerTool` espera el **shape** de zod (`tool.schema.shape`,
  un `Record<string, ZodType>`), no un `ZodObject` envuelto — por eso
  `ToolDef.schema` en `agent/tools.ts` está tipado como
  `z.ZodObject<z.ZodRawShape>` en vez de `z.ZodType` genérico.
- `@clerk/mcp-tools` pide `@modelcontextprotocol/sdk@^1.29.0` pero
  `mcp-handler@1.1.0` fija ese peer en `1.26.0` exacto (conflicto de rango) —
  se instaló con `--legacy-peer-deps` y se agregó `overrides` en
  `package.json` forzando una única versión (`^1.29.0`, resuelve a `1.30.0`)
  en todo el árbol, para no terminar con dos copias del SDK conviviendo.
  **Riesgo documentado, no verificado en runtime real todavía**: si
  `@clerk/mcp-tools` migra a la v2 del SDK en el futuro, hay que revisar este
  override y la versión de `mcp-handler` juntos.
- Zod **sí** se mantuvo en v4 en todo el proyecto (no hizo falta el fork a v3
  que el plan anticipaba como riesgo): se verificó que
  `@modelcontextprotocol/sdk@1.30.0` y `zod-to-json-schema@3.25.x` soportan
  `zod ^3.25 || ^4` nativamente.

### Verificado en esta sesión

`tsc --noEmit` y `npm run build` pasan limpio con las 17 rutas (incluyendo
`/api/[transport]`, los dos `.well-known/*`, y `/api/chat`). **No** se probó
en runtime real: ni el chat (necesita `ANTHROPIC_API_KEY` real + DB), ni una
conexión MCP real desde un cliente externo (necesita la app OAuth de MCP
habilitada en el dashboard de Clerk). El flujo de auth vía
`extra.authInfo.extra.userId` está confirmado leyendo el código fuente
publicado de `verifyClerkToken` (no es una suposición), pero el handshake
OAuth completo end-to-end no se ejecutó.

### Riesgo de costo sin resolver

Ni el chat ni las tools MCP descuentan créditos todavía. `search_products`
por sí solo puede disparar ~6 llamadas a Claude Opus por invocación. Es una
decisión explícita del usuario para esta entrega, pero es el primer punto a
resolver antes de exponer esto públicamente.

**Actualización (mismo día, post-feedback del usuario):** el usuario señaló
correctamente que en MCP el LLM que orquesta las tool calls es el del cliente
externo (pagado por esa sesión, no por nosotros) — no tenía sentido que
`analyze_product`/`compare_markets`/cada candidato de `search_products`
hicieran, ENCIMA, su propia llamada a Claude para redactar una narrativa que
el agente que llama ya puede escribir solo. Se refactorizó:

- `src/lib/pipeline.ts` separa `gatherEvidence()` (collectors + scoring,
  SIN LLM) de `runAnalysis()` (`gatherEvidence` + narrativa LLM, usado solo
  por `/api/analyze`, el formulario web, que no tiene otro LLM río abajo).
- Las tools del agente (`analyze_product`, `compare_markets`, cada candidato
  de `search_products`) ahora usan `gatherEvidence()` y devuelven evidencia
  cruda (signals + score + el `evidence` textual determinista de cada
  dimensión, ya armado sin LLM en `scoring/engine.ts`) — 0 llamadas propias a
  Claude por tool call. Tampoco persisten en la tabla `Report` (esa tabla
  sigue siendo solo para lo creado desde el formulario web).
- `analyze_competitor` se eliminó como tool separada: sin narrativa propia,
  el único diferenciador que tenía (el parámetro `framing`) dejó de tener
  sentido — `analyze_product` ya acepta tiendas/competidores como query.
  Quedaron 7 tools, no 8.
- `search_products` sigue pagando 1 llamada nuestra (el brainstorm de
  candidatos) porque necesita ideas concretas antes de poder correr
  collectors — el usuario decidió mantener esto así (opción elegida sobre
  también delegarlo al agente que llama).
- `generate_test_brief` y `get_report`/`list_reports` no cambiaron: siguen
  operando sobre reportes YA persistidos (con narrativa completa) creados
  desde el formulario web.
- **Chat con Task Budget**: `src/lib/agent/chat.ts` ahora pasa
  `output_config.task_budget` (beta `task-budgets-2026-03-13`, techo
  configurable por `CHAT_TASK_BUDGET_TOKENS`, default 50.000) al
  `toolRunner` — techo de tokens por turno agéntico completo (incluye tool
  calls encadenados), no por respuesta individual. Pedido explícito del
  usuario ("que el agente tenga una cantidad de tokens").

`tsc --noEmit` y `npm run build` pasan limpio después de este ajuste (17
rutas, sin cambios en la cuenta de rutas — solo lógica interna).

---

## Estado de implementación — credenciales de integraciones por usuario (BYOK)

Pedido del usuario: que cada uno cargue sus propias credenciales de
integraciones de DATOS desde la UI, **salvo** `ML_ACCESS_TOKEN` (excluido
explícitamente, sigue server-side) y `ANTHROPIC_API_KEY` (es de IA, no de
integraciones de datos — no se toca, el sistema de créditos sigue igual).
Plan completo (mismo archivo, reescrito para esta ronda) en
`~/.claude/plans/genera-un-plan-para-atomic-crystal.md`.

### Qué se construyó

- **`UserCredential`** (Prisma): tabla genérica `{clerkUserId, provider,
  encryptedValue}` — `provider` es `String` libre a propósito (no enum), para
  que sumar una integración nueva sea una entrada de código en
  `src/lib/credentials/providers.ts`, no una migración de schema.
  `encryptedValue` es un JSON cifrado con forma libre por provider.
- **`src/lib/credentials/crypto.ts`**: AES-256-GCM nativo de Node (sin
  dependencias nuevas), clave en `CREDENTIALS_ENCRYPTION_KEY`.
- **`src/lib/credentials/store.ts`**: `setUserCredential` valida contra
  `provider.verify()` (una consulta real a la API) **antes** de cifrar y
  guardar — nunca persiste un token roto.
- **`meta-ads.ts`**: `collectMetaAds(query, accessToken?)` ya no lee ningún
  env var — el token llega como parámetro. Se agregó
  `verifyMetaAdsAccessToken()` (consulta liviana, `limit=1`) reusada tanto
  por `provider.verify()` como potencialmente por el collector.
- **Threading del `clerkUserId`**: `gatherEvidence`/`runAnalysis`
  (`pipeline.ts`), `compareMarkets`, `searchProducts` y `getSourceStatuses`
  ganaron un parámetro `clerkUserId?`/`opts.clerkUserId` para resolver el
  credential del usuario antes de llamar al collector. Se propaga desde
  `/api/analyze/route.ts` (ya tenía `userId` de `auth()`) y desde
  `agent/tools.ts` (ya tenía `ctx.clerkUserId`).
- **UI**: `/dashboard/settings` (Server Component, lee `listUserCredentialStatus`
  + metadata de `CREDENTIAL_PROVIDERS`) + `IntegrationsList`/`IntegrationCard`
  (client, "Probar y guardar" llama al POST que valida antes de persistir).
  `/api/settings/credentials` (GET/POST/DELETE) nunca devuelve el secreto
  completo, solo `configured` + últimos 4 caracteres.

### Problema real encontrado con Prisma + Neon (no anticipado en el plan)

Al correr la migración nueva, `prisma migrate dev` tiró `P3005: database
schema is not empty`. Causa raíz: en Fase B, `prisma.config.ts` tenía
`shadowDatabaseUrl: env("DIRECT_URL")` — pero `DIRECT_URL` apunta a la MISMA
`neondb` (solo sin pooler), no a una shadow DB vacía de verdad. Funcionó la
primera vez de pura casualidad (la DB estaba vacía en ese momento). El
`Datasource` type de `@prisma/config` (Prisma 7) solo tiene `url` y
`shadowDatabaseUrl` — no existe un concepto separado de `directUrl` en
`prisma.config.ts` como sí existía en el `datasource` block de schema.prisma
pre-7.

Solución: se creó una DB extra y genuinamente vacía en el mismo proyecto de
Neon (`CREATE DATABASE prisma_shadow;` — el rol `neondb_owner` sí tiene
permiso) y se agregó `SHADOW_DATABASE_URL` como env var separada, distinta de
`DATABASE_URL`/`DIRECT_URL`. Además, la migración inicial (`init`) nunca
había dejado una tabla `_prisma_migrations` en la DB real (mismo motivo:
shadow==real confundió el flujo la primera vez) aunque el schema SÍ estaba
completo y correcto (se verificó índices/FKs a mano contra la DB antes de
confiar en esto) — se resolvió con `prisma migrate resolve --applied
20260830155111_init` para bautizar el estado existente sin tocar datos, y
recién ahí corrió limpio `prisma migrate dev --name add_user_credentials`.

**Si se vuelve a tocar `prisma.config.ts` o el setup de Neon**: `DIRECT_URL`
(misma DB, sin pooler, para migrar) y `SHADOW_DATABASE_URL` (DB vacía y
DISTINTA, scratch space de `migrate dev`) son conceptos diferentes — no
reusar una para la otra.

### Verificado en esta sesión

- Migración aplicada contra la Neon real, tabla `UserCredential` confirmada.
- `tsc --noEmit` y `npm run build` limpios (17 rutas + 2 nuevas: `/dashboard/settings`,
  `/api/settings/credentials`).
- Round-trip de cifrado (`encrypt`/`decrypt`) probado directo, sin pasar por HTTP.
- `setUserCredential` con un token de Meta inventado fue rechazado por
  `verify()` **antes** de tocar la DB (confirmado que nunca persiste basura).
- `listUserCredentialStatus` devuelve `configured: false` correctamente para
  un usuario sin nada guardado.
- **No probado**: guardar un token de Meta REAL y correr un análisis que
  efectivamente lo use (no hay token real disponible en esta sesión).

---

## Estado de implementación — Tienda Nube, Mercado Libre vendedor, BuiltWith + OAuth genérico

Pedido: "arma el panorama completo" de qué otras integraciones tiene sentido
sumar. Se investigó Tienda Nube, Mercado Libre como vendedor, Similarweb y
BuiltWith; Shopify quedó afuera a pedido explícito. Plan completo (mismo
archivo, reescrito para esta ronda) en
`~/.claude/plans/genera-un-plan-para-atomic-crystal.md`.

### Investigación que cambió el rumbo del plan

- **Tienda Nube NO necesita NubeSDK**: ese SDK es solo para apps embebidas en
  el admin de TN vía iframe. Una "aplicación independiente" (leer datos vía
  API, que es todo lo que necesitamos) usa OAuth2 plano. Esto tumbó la
  preocupación inicial de que el deadline del 30/08/2026 de NubeSDK
  (¡el mismo día de esta sesión!) nos obligara a un desarrollo mucho más
  pesado — no aplica a nuestro caso de uso.
- **El `redirect_uri` de Tienda Nube NO se pasa dinámicamente en la URL de
  autorización** — se registra una vez en el panel de partner al crear la
  app. Distinto de Mercado Libre, que sí lo pide en cada request.
- **Refresh token de Mercado Libre es de un solo uso**: cada refresh (access
  token dura 6hs) devuelve un refresh_token nuevo que hay que persistir de
  inmediato — el anterior queda inválido. Sin locking distribuido (riesgo
  documentado, aceptado para el volumen actual).
- **Similarweb se descartó**: API enterprise-only, ~US$35.000/año+, sin plan
  individual — no viable ni como BYOK ni pagada por nosotros en esta etapa.
- **BuiltWith tiene un Free API genuino** (conteo de categorías tecnológicas
  por dominio, sin costo, solo requiere una API key de registro gratuito) —
  por eso quedó como collector server-side, no BYOK (no es dato personal del
  usuario).

### Qué se construyó

- **`CredentialProvider` pasó a discriminated union** `authType: "manual" |
  "oauth"` en `src/lib/credentials/providers.ts`. Meta Ads es `manual` (sin
  cambios de comportamiento); se agregaron `tienda_nube` y
  `mercadolibre_seller` como `oauth`, implementados en
  `src/lib/credentials/oauth/tiendaNube.ts` y `mercadoLibreSeller.ts`.
- **Sin migración de schema**: `UserCredential.encryptedValue` (JSON cifrado
  de forma libre, diseño de la ronda anterior) ya soportaba guardar un token
  set OAuth completo (`accessToken`, `refreshToken`, `expiresAt`,
  `accountLabel`, `externalAccountId`) sin tocar la tabla — la decisión de
  hacerlo genérico desde el principio pagó.
- **`getUserCredential` (store.ts) refresca sola** un token OAuth vencido (o
  a <60s de vencer) antes de devolverlo, usando `provider.refresh()` si
  existe, y persiste el token set nuevo.
- **`state` del OAuth firmado con HMAC** (`src/lib/credentials/oauthState.ts`),
  reusa `CREDENTIALS_ENCRYPTION_KEY` como secreto de firma — sin tabla de
  "authorization requests" pendientes, TTL de 10 minutos, payload
  autocontenido (`clerkUserId`, `provider`, `nonce`, `iat`).
- **Rutas genéricas** `src/app/api/settings/credentials/[provider]/connect|callback/route.ts`
  — sirven para CUALQUIER provider `oauth` futuro, no están hardcodeadas a
  estos dos.
- **3 collectors nuevos**: `tiendanube-store.ts`, `mercadolibre-seller.ts`
  (ambos con degradación con gracia sin credential), `builtwith.ts`
  (server-side, `BUILTWITH_API_KEY`).
- **3 tools nuevas** en `agent/tools.ts`: `tienda_nube_snapshot`,
  `mercadolibre_seller_snapshot`, `lookup_tech_stack` — total 10 tools.
  Deliberadamente NO se integró el dato de tienda propia al scoring de
  `analyze_product` (queda como mejora futura explícita, documentada en el
  plan).
- **UI**: `IntegrationCard.tsx` ahora rama por `authType` — `oauth` muestra
  un botón "Conectar con {label}" (link a `/connect`) o el `accountLabel` +
  "Desconectar" si ya está conectado; `manual` sigue con el form de siempre.
  La página de settings muestra un banner de éxito/error leyendo
  `?connected=`/`?error=` del redirect del callback.

### Verificado en esta sesión

- `tsc --noEmit` y `npm run build` limpios (20 rutas, incluyendo las 2 rutas
  dinámicas `[provider]/connect` y `[provider]/callback`).
- Firmado/verificación de `state`: round-trip válido, provider incorrecto
  rechazado, firma alterada rechazada — probado directo sin pasar por HTTP.
- Los 3 collectors nuevos degradan con gracia correctamente sin credenciales
  configuradas (BuiltWith sin key, Tienda Nube/ML-vendedor sin credential).
- Las 10 tools cargan correctamente en `AGENT_TOOLS`.
- **No probado, porque no hay apps registradas todavía**: el handshake OAuth
  completo real contra Tienda Nube o Mercado Libre (connect → redirect real
  → callback → token guardado), y `lookup_tech_stack` contra la API real de
  BuiltWith (no hay `BUILTWITH_API_KEY` cargada). Los endpoints exactos de
  Tienda Nube (`/products`, `/orders`, `/store`) están armados siguiendo la
  convención documentada pero no se golpearon contra una tienda real.