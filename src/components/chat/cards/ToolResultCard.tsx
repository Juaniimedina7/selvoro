import { AnalysisResultCard } from "./AnalysisResultCard";
import { MarketplaceSearchResultCard } from "./MarketplaceSearchResultCard";

// Dispatcher por nombre de tool. Tools sin card acá simplemente no renderizan
// nada extra — su resultado ya quedó cubierto por la prosa que el agente
// redactó a partir del mismo dato. Sumar una card nueva es un case más.
export function ToolResultCard({ tool, data }: { tool: string; data: unknown }) {
  switch (tool) {
    case "analyze_product":
      return <AnalysisResultCard data={data} />;
    case "search_marketplace_products":
      return <MarketplaceSearchResultCard data={data} />;
    default:
      return null;
  }
}
