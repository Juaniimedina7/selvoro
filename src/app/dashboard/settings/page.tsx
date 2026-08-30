import { auth } from "@clerk/nextjs/server";
import { CREDENTIAL_PROVIDERS } from "@/lib/credentials/providers";
import { listUserCredentialStatus } from "@/lib/credentials/store";
import { IntegrationsList, type IntegrationItem } from "@/components/settings/IntegrationsList";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const { userId } = await auth();
  const statuses = await listUserCredentialStatus(userId!);
  const statusByProvider = new Map(statuses.map((s) => [s.provider, s]));

  const items: IntegrationItem[] = CREDENTIAL_PROVIDERS.map((p) => {
    const status = statusByProvider.get(p.id);
    return {
      providerId: p.id,
      authType: p.authType,
      label: p.label,
      description: p.description,
      helpUrl: p.helpUrl,
      fields: p.authType === "manual" ? p.fields : [],
      configured: status?.configured ?? false,
      maskedPreview: status?.maskedPreview ?? null,
    };
  });

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Integraciones</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        Cargá tus propias credenciales para las fuentes de datos que lo
        soportan. Se guardan cifradas y solo se usan en tus propios análisis
        (formulario, chat y MCP). Mercado Libre (búsqueda pública) y el LLM
        del reporte siguen siendo compartidos, no configurables acá.
      </p>
      {connected && (
        <p
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Conectado correctamente.
        </p>
      )}
      {error && (
        <p
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--accent-red)",
            color: "var(--accent-red)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          No se pudo conectar ({error}). Probá de nuevo.
        </p>
      )}
      <IntegrationsList initial={items} />
    </>
  );
}
