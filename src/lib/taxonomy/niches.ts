// Taxonomía de nichos para infoproductos / productos digitales (ebooks, guías,
// packs, plantillas...). Adaptada al español desde el material de referencia
// (nichos.pdf + planilla de keywords). El marco es: elegí un ÁREA de dolor →
// un NICHO → cruzá keywords del nicho con COMBINADORES (tipo de producto) para
// generar términos de búsqueda concretos. Concepto clave del PDF:
// "no es el producto, es el ángulo" — un mismo producto sirve a públicos distintos.

/** Áreas macro de dolor/deseo (nichos.pdf). */
export type AreaId =
  | "salud"
  | "riqueza"
  | "relaciones"
  | "espiritualidad"
  | "productividad"
  | "entretenimiento";

export const AREAS: { id: AreaId; label: string }[] = [
  { id: "salud", label: "Salud" },
  { id: "riqueza", label: "Riqueza" },
  { id: "relaciones", label: "Relaciones" },
  { id: "espiritualidad", label: "Espiritualidad" },
  { id: "productividad", label: "Tiempo y productividad" },
  { id: "entretenimiento", label: "Entretenimiento" },
];

export type NicheId =
  | "salud"
  | "dinero"
  | "relaciones"
  | "recetas"
  | "espiritualidad"
  | "padres_educacion"
  | "productividad"
  | "ia"
  | "entretenimiento";

export interface Niche {
  id: NicheId;
  label: string;
  emoji: string;
  area: AreaId;
  /** Keywords del nicho (español). Se cruzan con COMBINADORES para armar búsquedas. */
  keywords: string[];
}

export const NICHES: Niche[] = [
  {
    id: "salud",
    label: "Salud",
    emoji: "🏋️",
    area: "salud",
    keywords: [
      "dieta", "detox", "metabolismo", "ayuno", "keto", "diabetes", "energía",
      "sueño", "hormonas", "intestino", "inmunidad", "colesterol", "dolor",
      "articulaciones", "postura", "ansiedad", "estrés", "meditación", "longevidad",
    ],
  },
  {
    id: "dinero",
    label: "Dinero",
    emoji: "💰",
    area: "riqueza",
    keywords: [
      "dinero", "ingresos", "ganancias", "negocio", "emprender", "marketing",
      "ventas", "embudo", "anuncios", "tráfico", "afiliados", "dropshipping",
      "invertir", "cripto", "acciones", "forex", "riqueza", "millonario",
      "libertad financiera", "escalar",
    ],
  },
  {
    id: "relaciones",
    label: "Relaciones",
    emoji: "❤️",
    area: "relaciones",
    keywords: [
      "amor", "relación", "ex", "conquista", "seducción", "noviazgo",
      "matrimonio", "intimidad", "celos", "confianza", "coqueteo", "atracción",
      "conexión", "emocional", "apego", "reconquista", "autoestima", "romance",
      "pareja",
    ],
  },
  {
    id: "recetas",
    label: "Recetas / Nutrición",
    emoji: "🍲",
    area: "salud",
    keywords: [
      "recetas", "cocina", "práctico", "rápido", "saludable", "bajo en carbos",
      "keto", "vegano", "sin gluten", "dulces", "salados", "viandas", "menú",
      "almuerzo", "cena", "postres", "jugos", "nutrición", "dieta", "culinaria",
    ],
  },
  {
    id: "espiritualidad",
    label: "Espiritualidad",
    emoji: "🧘",
    area: "espiritualidad",
    keywords: [
      "espiritual", "energía", "manifestación", "abundancia", "gratitud",
      "meditación", "consciencia", "propósito", "alma", "despertar", "sanación",
      "chakras", "oración", "fe", "milagro", "universo", "intuición",
      "equilibrio", "paz", "reiki",
    ],
  },
  {
    id: "padres_educacion",
    label: "Padres / Educación",
    emoji: "👨‍👩‍👧",
    area: "relaciones",
    keywords: [
      "padres", "hijos", "niños", "educar", "disciplina", "comportamiento",
      "rutina", "escuela", "aprender", "lectura", "estudio", "atención",
      "autismo", "pantallas", "sueño infantil", "alimentación", "psicología",
      "familia", "maternidad", "paternidad",
    ],
  },
  {
    id: "productividad",
    label: "Productividad",
    emoji: "⏱️",
    area: "productividad",
    keywords: [
      "productividad", "tiempo", "rutina", "foco", "disciplina", "hábitos",
      "planificación", "metas", "procrastinación", "organización", "agenda",
      "ejecución", "rendimiento", "energía", "mañana", "noche", "ritual",
      "sistema", "eficiencia", "resultados",
    ],
  },
  {
    id: "ia",
    label: "Inteligencia Artificial",
    emoji: "🤖",
    area: "productividad",
    keywords: [
      "inteligencia artificial", "chatgpt", "automatización", "robots",
      "herramientas", "prompt", "contenido", "diseño", "video", "audio", "voz",
      "imagen", "negocios", "marketing", "ventas", "ingresos", "productividad",
      "asistente", "agente",
    ],
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    emoji: "🎲",
    area: "entretenimiento",
    keywords: [
      "juegos", "acertijos", "pasatiempos", "sudoku", "crucigramas", "trivia",
      "colorear", "mandalas", "lectura", "libros", "cuentos", "hobbies",
      "manualidades", "sopa de letras", "laberintos",
    ],
  },
];

/**
 * COMBINADORES: palabras de "tipo de producto digital / modificador" que se
 * cruzan con las keywords del nicho para armar términos de búsqueda
 * (ej. "keto" + "Guía definitiva" = "Guía definitiva keto"). Español.
 * NO hay que usarlas todas: se eligen las relevantes según el caso.
 */
export const COMBINADORES: string[] = [
  "Ebook", "Libro", "Guía", "Guía completa", "Guía definitiva", "Paso a paso",
  "Cómo", "Aprende a", "Manual", "Método", "Fórmula", "Plantilla", "Plantillas",
  "Imprimible", "Imprimibles", "Cuaderno", "Recetario", "Recetas", "Checklist",
  "Lista", "Secreto", "Secretos", "Truco", "Trucos", "Descarga",
  "Descarga inmediata", "Acceso inmediato", "Gratis", "Recurso", "Recursos",
  "Pack", "Mega Pack", "Kit", "Bundle", "Curso", "Mini curso", "Masterclass",
  "Taller", "Entrenamiento", "Reto", "Desafío", "Plan", "Sistema", "Material",
  "Materiales", "Editable", "Editables", "Completo", "Definitivo",
  "Para principiantes", "Todo en uno", "Revelado", "Planner", "Cards", "Combo",
  "Actividades", "Contenido", "Colección", "Bonus", "Especial", "Audiolibro",
];

/**
 * Combinadores multilingües (ES / EN / PT). Para descubrir infoproductos
 * ganadores en otros mercados (US, BR) y traerlos a AR/LATAM, la búsqueda web
 * suele hacerse en el idioma del mercado de origen. Fuente: planilla de
 * palabras clave de ebooks. De nuevo: son vocabulario disponible, no una
 * checklist obligatoria.
 */
export const COMBINADORES_MULTILINGUE: {
  es: string[];
  en: string[];
  pt: string[];
} = {
  es: COMBINADORES,
  en: [
    "printable", "ebook", "e-book", "bundle", "guide", "ultimate guide",
    "complete guide", "made simple", "step by step", "how to", "learn how",
    "workbook", "worksheets", "planner", "template", "templates", "masterclass",
    "devotional", "checklist", "journal", "cheat sheet", "blueprint", "roadmap",
    "toolkit", "handbook", "playbook", "beginner", "beginners guide", "proven",
    "manifest", "manifestation", "challenge", "secret", "secrets", "method",
    "formula", "recipes", "meal plan", "pack", "mega pack", "digital download",
    "instant download", "instant access", "download now", "free download",
    "free guide", "free training", "free masterclass", "study", "study guide",
    "course", "mini course", "training", "workshop", "bootcamp", "program",
    "system", "prompts", "printables", "editable", "done for you",
    "everything you need", "all in one",
  ],
  pt: [
    "ebook", "e-book", "livro", "guia", "guia completo", "guia definitivo",
    "passo a passo", "como", "aprenda a", "manual", "método", "fórmula",
    "modelo", "modelos", "imprimível", "imprimíveis", "caderno", "caderninho",
    "receitas", "checklist", "lista", "segredo", "segredos", "truque",
    "truques", "download", "acesso imediato", "baixar agora", "grátis",
    "material", "materiais", "recursos", "pacote", "mega pack", "kit", "combo",
    "curso", "minicurso", "masterclass", "treinamento", "desafio", "plano",
    "sistema", "planner", "cards", "cartões", "editável", "editáveis",
    "completo", "definitivo", "para iniciantes", "tudo em um", "pronto para usar",
    "saiba mais", "atividades", "conteúdo", "coleção", "bônus", "especial",
  ],
};

/** Países soportados para filtrar la búsqueda (mercados objetivo). */
export type CountryCode = "AR" | "US" | "MX" | "BR" | "CL" | "CO" | "ES" | "UY" | "PE";

export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: "AR", label: "Argentina" },
  { code: "US", label: "Estados Unidos" },
  { code: "MX", label: "México" },
  { code: "BR", label: "Brasil" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "ES", label: "España" },
  { code: "UY", label: "Uruguay" },
  { code: "PE", label: "Perú" },
];

/** Filtros de descubrimiento de productos. */
export interface DiscoveryFilters {
  niche?: NicheId;
  /** Keywords adicionales del usuario, se suman a las del nicho. */
  keywords?: string[];
  country?: CountryCode;
  /** Rango de fechas (ISO). Para "anuncios activos desde" / recencia. */
  dateFrom?: string;
  dateTo?: string;
  productType?: "fisico" | "digital" | "ambos";
}

// ---------- helpers ----------

export function getNiche(id: NicheId): Niche | undefined {
  return NICHES.find((n) => n.id === id);
}

export function nichesByArea(area: AreaId): Niche[] {
  return NICHES.filter((n) => n.area === area);
}

/**
 * Genera términos de búsqueda cruzando las keywords de un nicho con los
 * combinadores (tipo de producto). Determinístico. Ideal para sembrar
 * búsquedas de infoproductos o el brainstorm de discovery.
 */
export function buildSearchTerms(
  nicheId: NicheId,
  opts?: { combinadores?: string[]; extraKeywords?: string[]; limit?: number },
): string[] {
  const niche = getNiche(nicheId);
  if (!niche) return [];
  const keywords = [...niche.keywords, ...(opts?.extraKeywords ?? [])];
  const combos = opts?.combinadores ?? COMBINADORES;
  const terms: string[] = [];
  for (const kw of keywords) {
    for (const combo of combos) {
      terms.push(`${combo} ${kw}`);
    }
  }
  return typeof opts?.limit === "number" ? terms.slice(0, opts.limit) : terms;
}

/**
 * Renderiza la taxonomía como CONTEXTO para la IA que busca (discovery/chat/web).
 * Objetivo: que el modelo conozca el vocabulario de infoproductos y cómo
 * combinarlo — NO que use todos los términos en una sola búsqueda.
 */
export function taxonomyGuidanceForAgent(): string {
  const nichesBlock = NICHES.map(
    (n) => `- ${n.label} (${n.id}): ${n.keywords.slice(0, 12).join(", ")}…`,
  ).join("\n");

  return [
    "CONTEXTO DE INFOPRODUCTOS (ebooks, guías, packs, plantillas, cursos):",
    "",
    "Cómo usar este vocabulario: es material DISPONIBLE, no una checklist.",
    "Elegí pocos términos RELEVANTES por búsqueda. Para infoproductos, combiná una",
    'keyword del nicho con un "combinador" de tipo de producto (ej. "guía',
    'definitiva keto", "planner de finanzas", "meal plan low carb"). No amontones',
    "términos ni uses todos en una query. Para descubrir ganadores en US o BR y",
    "traerlos a Argentina, buscá también en inglés/portugués con los combinadores",
    "de ese idioma.",
    "",
    "Nichos y keywords (muestra):",
    nichesBlock,
    "",
    `Combinadores ES: ${COMBINADORES.slice(0, 30).join(", ")}…`,
    `Combinadores EN: ${COMBINADORES_MULTILINGUE.en.slice(0, 24).join(", ")}…`,
    `Combinadores PT: ${COMBINADORES_MULTILINGUE.pt.slice(0, 24).join(", ")}…`,
  ].join("\n");
}
