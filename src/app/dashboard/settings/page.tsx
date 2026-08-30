import { auth } from "@clerk/nextjs/server";
import { CREDENTIAL_PROVIDERS } from "@/lib/credentials/providers";
import { listUserCredentialStatus } from "@/lib/credentials/store";
import { IntegrationsList, type IntegrationItem } from "@/components/settings/IntegrationsList";

export default async function SettingsPage() {
  const { userId } = await auth();
  const statuses = await listUserCredentialStatus(userId!);
  const statusByProvider = new Map(statuses.map((s) => [s.provider, s]));

  const items: IntegrationItem[] = CREDENTIAL_PROVIDERS.map((p) => {
    const status = statusByProvider.get(p.id);
    return {
      providerId: p.id,
      label: p.label,
      description: p.description,
      helpUrl: p.helpUrl,
      fields: p.fields,
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
        (formulario, chat y MCP). Mercado Libre y el LLM del reporte siguen
        siendo compartidos, no configurables acá.
      </p>
      <IntegrationsList initial={items} />
    </>
  );
}
