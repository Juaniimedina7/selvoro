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