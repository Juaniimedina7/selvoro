// Sincroniza secrets de GitHub Actions → variables de entorno de Vercel.
// Solo agrega las que FALTAN (no pisa las existentes), en production/preview/development.
// Lo ejecuta .github/workflows/sync-env.yml. Usa la REST API de Vercel (fetch nativo
// de Node 18+), no necesita la CLI.

const TOKEN = process.env.VERCEL_TOKEN;
const ORG_ID = process.env.VERCEL_ORG_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const SECRETS = JSON.parse(process.env.SECRETS_JSON || "{}");

if (!TOKEN || !PROJECT_ID) {
  console.error("Faltan VERCEL_TOKEN o VERCEL_PROJECT_ID en el entorno.");
  process.exit(1);
}

// Secrets que NO son variables de entorno de la app (no se sincronizan).
const DENYLIST = new Set(
  ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "GITHUB_TOKEN"].map((s) =>
    s.toUpperCase(),
  ),
);

const TARGETS = ["production", "preview", "development"];
const BASE = "https://api.vercel.com";
const teamQ = ORG_ID ? `?teamId=${encodeURIComponent(ORG_ID)}` : "";

async function listExistingKeys() {
  const res = await fetch(`${BASE}/v9/projects/${PROJECT_ID}/env${teamQ}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`No pude listar env de Vercel: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return new Set((json.envs ?? []).map((e) => e.key));
}

async function addEnv(key, value) {
  const res = await fetch(`${BASE}/v10/projects/${PROJECT_ID}/env${teamQ}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key, value, type: "encrypted", target: TARGETS }),
  });
  if (!res.ok) {
    console.warn(`  ⚠ ${key}: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

const existing = await listExistingKeys();
let added = 0;
let skipped = 0;

for (const [key, value] of Object.entries(SECRETS)) {
  if (DENYLIST.has(key.toUpperCase())) continue;
  if (typeof value !== "string" || value.length === 0) {
    skipped++;
    continue;
  }
  if (existing.has(key)) {
    console.log(`= ${key} (ya existe en Vercel)`);
    skipped++;
    continue;
  }
  if (await addEnv(key, value)) {
    console.log(`+ ${key} (agregada)`);
    added++;
  } else {
    skipped++;
  }
}

console.log(`\nListo. Agregadas: ${added} · sin cambios: ${skipped}.`);
if (added > 0) {
  console.log("Nota: las env vars nuevas aplican al PRÓXIMO deploy. Redeployá para tomarlas.");
}
