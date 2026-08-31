import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { AGENT_TOOLS, type ToolContext } from "@/lib/agent/tools";

// Servidor MCP remoto de Selvoro. Expone las mismas 13 tools que usa el chat
// web (src/lib/agent/tools.ts), autenticado vía OAuth de Clerk — el cliente
// MCP (Claude Desktop, Claude.ai, etc.) completa el consentimiento de Clerk y
// las tools reciben el mismo clerkUserId que usa todo src/lib/ (sin tabla de
// API keys propia). Sin gating de créditos por ahora (ver plan).

const mcpHandler = createMcpHandler(
  (server) => {
    for (const tool of AGENT_TOOLS) {
      server.registerTool(
        tool.name,
        { title: tool.title, description: tool.description, inputSchema: tool.schema.shape },
        async (input: unknown, extra) => {
          const clerkUserId = (
            extra?.authInfo?.extra as Record<string, unknown> | undefined
          )?.userId as string | undefined;

          if (!clerkUserId) {
            return {
              content: [{ type: "text" as const, text: "No se pudo verificar el usuario autenticado." }],
              isError: true,
            };
          }

          const ctx: ToolContext = { clerkUserId, source: "mcp" };
          try {
            const result = await tool.handler(ctx, input);
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
          } catch (e) {
            console.error(`[mcp:${tool.name}] error:`, e);
            return {
              content: [{ type: "text" as const, text: "La tool falló. Revisá los logs del servidor." }],
              isError: true,
            };
          }
        },
      );
    }
  },
  {},
  { basePath: "/api", verboseLogs: false, maxDuration: 120 },
);

const authHandler = withMcpAuth(
  mcpHandler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource" },
);

export { authHandler as GET, authHandler as POST };
