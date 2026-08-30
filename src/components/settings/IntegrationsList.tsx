"use client";

import { useState } from "react";
import { IntegrationCard } from "@/components/settings/IntegrationCard";
import type { CredentialField } from "@/lib/credentials/providers";

export interface IntegrationItem {
  providerId: string;
  authType: "manual" | "oauth";
  label: string;
  description: string;
  helpUrl: string;
  fields: CredentialField[];
  configured: boolean;
  maskedPreview: string | null;
}

export function IntegrationsList({ initial }: { initial: IntegrationItem[] }) {
  const [items, setItems] = useState(initial);

  async function refetch() {
    const res = await fetch("/api/settings/credentials");
    if (!res.ok) return;
    const { statuses } = (await res.json()) as {
      statuses: { provider: string; configured: boolean; maskedPreview: string | null }[];
    };
    setItems((prev) =>
      prev.map((item) => {
        const status = statuses.find((s) => s.provider === item.providerId);
        return status ? { ...item, configured: status.configured, maskedPreview: status.maskedPreview } : item;
      }),
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item) => (
        <IntegrationCard
          key={item.providerId}
          providerId={item.providerId}
          authType={item.authType}
          label={item.label}
          description={item.description}
          helpUrl={item.helpUrl}
          fields={item.fields}
          configured={item.configured}
          maskedPreview={item.maskedPreview}
          onSaved={refetch}
        />
      ))}
    </div>
  );
}
