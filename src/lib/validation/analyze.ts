import { z } from "zod";

export const analyzeBodySchema = z.object({
  query: z.string().trim().min(2, "Ingresá un producto (nombre o URL), mínimo 2 caracteres."),
  ticketUsd: z.number().positive().optional(),
});
