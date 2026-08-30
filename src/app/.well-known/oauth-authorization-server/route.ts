import { authServerMetadataHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

// RFC 8414 — solo para compatibilidad con clientes MCP más viejos que todavía
// buscan este endpoint en vez de resolver el authorization server vía
// Protected Resource Metadata (RFC 9728, ver oauth-protected-resource/route.ts).
const handler = authServerMetadataHandlerClerk();

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
