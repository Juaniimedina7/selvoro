import Anthropic from "@anthropic-ai/sdk";

// Capa de abstracción del LLM (plan §10: no atarse a un solo proveedor).
// Hoy: Anthropic/Claude. La interfaz permite enchufar otro proveedor sin tocar
// el resto del código.

export interface LlmJsonRequest {
  system: string;
  user: string;
  /** JSON Schema (draft) para forzar la forma de la salida. */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

export interface LlmProvider {
  /** Devuelve un objeto validado contra `schema`. */
  generateJson<T>(req: LlmJsonRequest): Promise<T>;
}

class AnthropicProvider implements LlmProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
    this.model = process.env.SELVORO_MODEL || "claude-opus-4-8";
  }

  async generateJson<T>(req: LlmJsonRequest): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 16000,
      thinking: { type: "adaptive" },
      system: req.system,
      output_config: {
        format: {
          type: "json_schema",
          schema: req.schema,
        },
      },
      messages: [{ role: "user", content: req.user }],
    });

    // output_config.format garantiza que el primer bloque de texto es JSON válido.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("El LLM no devolvió contenido de texto.");
    }
    return JSON.parse(textBlock.text) as T;
  }
}

let cached: LlmProvider | null = null;

export function getLlm(): LlmProvider {
  if (!cached) cached = new AnthropicProvider();
  return cached;
}
