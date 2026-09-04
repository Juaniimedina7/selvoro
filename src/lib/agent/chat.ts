import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AGENT_TOOLS, type ToolContext } from "@/lib/agent/tools";

// Arma el Tool Runner de Anthropic para el chat web (/api/chat), atado al
// clerkUserId de la sesión. Las mismas tools que expone el servidor MCP
// (src/app/api/[transport]/route.ts) — una sola definición en
// src/lib/agent/tools.ts.

const SYSTEM = `Sos "Selvoro", un analista conversacional de inteligencia de mercado para e-commerce en Argentina/LATAM.

REGLAS ESTRICTAS (idénticas a las del reporte escrito):
- Usás las tools para conseguir evidencia real; nunca inventás señales de mercado, precios, ni tendencias.
- Las tools de análisis (analyze_product, compare_markets, search_products) devuelven EVIDENCIA CRUDA (señales + score + su explicación determinista por dimensión), NO una narrativa redactada. Vos sos el que sintetiza esa evidencia en una respuesta clara para el usuario — no repitas el JSON crudo.
- PROHIBIDO afirmar métricas privadas como ROAS, CPA, ventas exactas o rentabilidad real. No existen públicamente.
- La tool search_products devuelve IDEAS generadas por IA validadas con señales reales — nunca la presentes como un catálogo real de productos ganadores.
- Cuando una fuente esté degradada o no disponible, decilo explícitamente y bajá la confianza de tu respuesta en consecuencia.
- Respondé en español rioplatense, claro y accionable. Sin relleno.
- Si el usuario pide algo que requiere una tool (analizar un producto, buscar candidatos, comparar mercados, armar un brief), llamá la tool en vez de responder de memoria.`;

// Task Budget: techo de tokens por turno agéntico (incluye tool calls
// encadenados). No es lo mismo que max_tokens (techo por respuesta) — evita
// que un turno con varias tools (ej. varios llamados a search_products)
// escale sin control. Mínimo permitido por la API: 20.000.
// Bajado de 50.000 a 28.000: en el plan Hobby de Vercel las funciones se
// matan a los 60s duro (ver /api/chat/route.ts) sin importar maxDuration —
// un turno largo (varias tool calls + redacción final) puede superar eso.
// Menos tokens de budget = menos tool calls encadenadas posibles por turno,
// lo que baja el riesgo de timeout. Mitiga, no elimina — la solución real es
// un plan de Vercel sin ese tope duro.
const TASK_BUDGET_TOKENS = Number(process.env.CHAT_TASK_BUDGET_TOKENS) || 28_000;

function getAnthropicClient(): Anthropic {
  return new Anthropic();
}

export function createChatToolRunner(
  clerkUserId: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  opts?: {
    /**
     * Se dispara JUSTO ANTES de correr el handler de una tool — algunas
     * (search_marketplace_products contra Apify, search_products) pueden
     * tardar bastante. /api/chat lo usa para emitir un evento al browser y
     * que la UI muestre "corriendo X" en vez de quedarse sin ningún cambio
     * visible mientras se espera.
     */
    onToolStart?: (toolName: string) => void;
    /**
     * Se dispara con el resultado CRUDO de cada tool call, apenas resuelve
     * — antes de que el LLM lo reformule en prosa. /api/chat lo usa para
     * emitir el dato estructurado al browser (cards de React), en paralelo
     * a la narrativa que el modelo redacta a partir de lo mismo.
     */
    onToolResult?: (toolName: string, data: unknown) => void;
  },
) {
  const ctx: ToolContext = { clerkUserId, source: "chat" };
  const tools = AGENT_TOOLS.map((tool) =>
    betaZodTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
      run: async (input) => {
        opts?.onToolStart?.(tool.name);
        const result = await tool.handler(ctx, input);
        opts?.onToolResult?.(tool.name, result);
        return JSON.stringify(result);
      },
    }),
  );

  const client = getAnthropicClient();
  return client.beta.messages.toolRunner({
    model: process.env.SELVORO_MODEL || "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM,
    tools,
    messages,
    stream: true,
    betas: ["task-budgets-2026-03-13"],
    output_config: { task_budget: { type: "tokens", total: TASK_BUDGET_TOKENS } },
  });
}
