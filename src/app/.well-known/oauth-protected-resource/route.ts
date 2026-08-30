import { protectedResourceHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

// RFC 9728 Protected Resource Metadata — le dice al cliente MCP (Claude
// Desktop, Claude.ai, etc.) contra qué authorization server (Clerk) validar
// el token antes de conectarse a /api/mcp.
const handler = protectedResourceHandlerClerk();

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
