import type { CountryCode } from "@/lib/taxonomy/niches";
import type { CollectorResult, Signal, TrendsData } from "@/lib/types";

// Collector de Google Trends (best-effort). No hay API oficial: usamos el mismo
// flujo que pytrends (explore -> widget token -> multiline). Es frágil por diseño,
// así que degrada con gracia. Los valores son RELATIVOS (0-100), nunca ventas.

const TRENDS_BASE = "https://trends.google.com/trends/api";

// Sin un User-Agent de navegador real, Google devuelve 429 con mucha más
// facilidad (lo confirmamos en vivo): el endpoint no es oficial y su
// detección de bots penaliza clientes que se identifican como script.
const BROWSER_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

function stripPrefix(text: string): string {
  // Las respuestas de Trends vienen con un prefijo anti-JSON-hijacking: ")]}',\n".
  const idx = text.indexOf("{");
  const arrIdx = text.indexOf("[");
  const start =
    idx === -1 ? arrIdx : arrIdx === -1 ? idx : Math.min(idx, arrIdx);
  return start >= 0 ? text.slice(start) : text;
}

function direction(points: number[]): TrendsData["ar"]["direction"] {
  if (points.length < 4) return "desconocido";
  const half = Math.floor(points.length / 2);
  const first = points.slice(0, half);
  const last = points.slice(half);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const delta = avg(last) - avg(first);
  if (delta > 8) return "subiendo";
  if (delta < -8) return "bajando";
  return "estable";
}

interface ExploreWidget {
  id: string;
  request: unknown;
  token: string;
}

async function getInterestOverTime(
  query: string,
  geo: string,
  timeframe = "today 12-m",
): Promise<number[] | null> {
  const exploreReq = {
    comparisonItem: [{ keyword: query, geo, time: timeframe }],
    category: 0,
    property: "",
  };
  const exploreUrl =
    `${TRENDS_BASE}/explore?hl=es&tz=180` +
    `&req=${encodeURIComponent(JSON.stringify(exploreReq))}`;

  const exploreRes = await fetch(exploreUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!exploreRes.ok) return null;

  const exploreJson = JSON.parse(stripPrefix(await exploreRes.text())) as {
    widgets?: ExploreWidget[];
  };
  const widget = exploreJson.widgets?.find((w) => w.id === "TIMESERIES");
  if (!widget) return null;

  const iotReq = {
    ...(widget.request as object),
  };
  const iotUrl =
    `${TRENDS_BASE}/widgetdata/multiline?hl=es&tz=180` +
    `&req=${encodeURIComponent(JSON.stringify(iotReq))}` +
    `&token=${encodeURIComponent(widget.token)}`;

  const iotRes = await fetch(iotUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!iotRes.ok) return null;

  const iotJson = JSON.parse(stripPrefix(await iotRes.text())) as {
    default?: { timelineData?: Array<{ value?: number[] }> };
  };
  const timeline = iotJson.default?.timelineData ?? [];
  const points = timeline
    .map((t) => t.value?.[0])
    .filter((v): v is number => typeof v === "number");
  return points.length ? points : null;
}

export async function collectTrends(
  query: string,
  country: CountryCode = "AR",
  dateFrom?: string,
  dateTo?: string,
): Promise<CollectorResult> {
  const source = "Google Trends (no oficial)";
  // Trends acepta "YYYY-MM-DD YYYY-MM-DD" como timeframe custom.
  const timeframe =
    dateFrom && dateTo ? `${dateFrom} ${dateTo}` : "today 12-m";

  const degraded = (note: string, error?: string): CollectorResult => {
    const data: TrendsData = {
      available: false,
      ar: { direction: "desconocido", points: [] },
      us: { direction: "desconocido", points: [] },
      homeCountry: country,
      note,
    };
    const signals: Signal[] = [
      {
        key: "trends_status",
        label: "Cobertura Google Trends",
        value: "no disponible",
        source,
        confidence: "baja",
        unavailable: true,
      },
    ];
    return { source, signals, raw: { trends: data }, error };
  };

  try {
    const [ar, us] = await Promise.all([
      getInterestOverTime(query, country, timeframe).catch(() => null),
      getInterestOverTime(query, "US", timeframe).catch(() => null),
    ]);

    if (!ar && !us) {
      return degraded(
        "Google Trends no devolvió datos (rate limit o cambio de endpoint). Es una fuente no oficial y frágil.",
      );
    }

    const data: TrendsData = {
      available: true,
      ar: { direction: direction(ar ?? []), points: ar ?? [] },
      us: { direction: direction(us ?? []), points: us ?? [] },
      homeCountry: country,
    };

    const signals: Signal[] = [
      {
        key: "trend_ar",
        label: "Tendencia de búsqueda AR (12m)",
        value: data.ar.direction,
        source,
        confidence: ar ? "media" : "baja",
      },
      {
        key: "trend_us",
        label: "Tendencia de búsqueda US (12m)",
        value: data.us.direction,
        source,
        confidence: us ? "media" : "baja",
      },
    ];

    return { source, signals, raw: { trends: data } };
  } catch (e) {
    return degraded("Error consultando Google Trends.", String(e));
  }
}
