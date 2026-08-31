import { z } from "zod";

// Enums alineados con src/lib/taxonomy/niches.ts (CountryCode / NicheId).
const COUNTRY_CODES = ["AR", "US", "MX", "BR", "CL", "CO", "ES", "UY", "PE"] as const;
const NICHE_IDS = [
  "salud",
  "dinero",
  "relaciones",
  "recetas",
  "espiritualidad",
  "padres_educacion",
  "productividad",
  "ia",
  "entretenimiento",
] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato YYYY-MM-DD).");

export const analyzeBodySchema = z.object({
  query: z.string().trim().min(2, "Ingresá un producto (nombre o URL), mínimo 2 caracteres."),
  ticketUsd: z.number().positive().optional(),
  market: z.enum(COUNTRY_CODES).optional(),
  nicheId: z.enum(NICHE_IDS).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});
