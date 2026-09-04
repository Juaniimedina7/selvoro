import type { MarketplaceSearchResult } from "@/lib/types";

const MARKETPLACE_LABEL: Record<string, string> = {
  amazon: "Amazon",
  aliexpress: "AliExpress",
  alibaba: "Alibaba",
  mercadolibre: "Mercado Libre",
};

function isMarketplaceSearchResult(data: unknown): data is MarketplaceSearchResult {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.marketplace === "string" && Array.isArray(d.items);
}

export function MarketplaceSearchResultCard({ data }: { data: unknown }) {
  if (!isMarketplaceSearchResult(data)) return null;
  const label = MARKETPLACE_LABEL[data.marketplace] ?? data.marketplace;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 16,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            {label}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, marginTop: 2 }}>
            &quot;{data.query}&quot;
          </div>
        </div>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{data.items.length} resultados</span>
      </div>

      {!data.available || data.items.length === 0 ? (
        <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
          {data.note ?? "Sin resultados."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {data.items.slice(0, 8).map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0, background: "var(--surface)" }}
                />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--border)", flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  {item.price != null ? `${item.currency ?? "$"}${item.price}` : "Sin precio"}
                  {item.rating != null ? ` · ★ ${item.rating}` : ""}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
