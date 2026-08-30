import { gatherEvidence } from "@/lib/pipeline";
import type { AnalyzeInput } from "@/lib/types";

// compare_markets: NO agrega collectors nuevos. TrendsData y MetaAdsData ya
// comparan AR vs US dentro de la evidencia (ver src/lib/types.ts) — esta
// función corre gatherEvidence (sin LLM) y re-proyecta esos dos campos en un
// formato de comparación explícito. Limitación real: solo soporta AR vs US,
// porque los collectors están hardcodeados a esos dos mercados.

export interface MarketComparison {
  query: string;
  ar: {
    trendDirection: string;
    metaActiveAds: number | null;
    metaUniqueAdvertisers: number | null;
  };
  us: {
    trendDirection: string;
    metaActiveAds: number | null;
  };
  note: string;
}

export async function compareMarkets(input: AnalyzeInput): Promise<MarketComparison> {
  const evidence = await gatherEvidence(input);

  return {
    query: input.query,
    ar: {
      trendDirection: evidence.trends.ar.direction,
      metaActiveAds: evidence.metaAds.ar?.activeAdsCount ?? null,
      metaUniqueAdvertisers: evidence.metaAds.ar?.uniqueAdvertisers ?? null,
    },
    us: {
      trendDirection: evidence.trends.us.direction,
      metaActiveAds: evidence.metaAds.us?.activeAdsCount ?? null,
    },
    note:
      "Comparación AR vs US únicamente (los collectors no soportan otros pares de mercado todavía). " +
      evidence.dataCoverageNote,
  };
}
