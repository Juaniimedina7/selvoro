// Sincroniza secrets de GitHub Actions → variables de entorno de Vercel.
// Por default solo agrega las que FALTAN (no pisa las existentes), en
// production/preview/development. Opcionalmente, vía la env var
// FORCE_UPDATE_KEYS (lista separada por comas, la pasa el workflow como
// input manual), fuerza la ACTUALIZACIÓN de esas keys puntuales aunque ya
// existan — para el caso real de rotar/corregir una key que ya está
// cargada en Vercel con un valor viejo o inválido, sin tener que acceder al
// dashboard (mismo problema real que motivó agregar esto: la cuenta de
// Vercel CLI local no tiene acceso al team/proyecto real de producción).
// Lo ejecuta .github/workflows/sync-env.yml. Usa la REST API de Vercel (fetch nativo
// de Node 18+), no necesita la CLI.

const TOKEN = process.env.VERCEL_TOKEN;
const ORG_ID = process.env.VERCEL_ORG_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const SECRETS = JSON.parse(process.env.SECRETS_JSON || "{}");
const FORCE_UPDATE_KEYS = new Set(
  (process.env.FORCE_UPDATE_KEYS || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

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

/** key -> id de cada env var ya cargada en Vercel. */
async function listExistingEnvs() {
  const res = await fetch(`${BASE}/v9/projects/${PROJECT_ID}/env${teamQ}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`No pude listar env de Vercel: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return new Map((json.envs ?? []).map((e) => [e.key, e.id]));
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

async function updateEnv(id, key, value) {
  const res = await fetch(`${BASE}/v9/projects/${PROJECT_ID}/env/${id}${teamQ}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value, target: TARGETS }),
  });
  if (!res.ok) {
    console.warn(`  ⚠ ${key}: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

const existing = await listExistingEnvs();
let added = 0;
let updated = 0;
let skipped = 0;

for (const [key, value] of Object.entries(SECRETS)) {
  if (DENYLIST.has(key.toUpperCase())) continue;
  if (typeof value !== "string" || value.length === 0) {
    skipped++;
    continue;
  }
  const existingId = existing.get(key);
  if (existingId != null) {
    if (FORCE_UPDATE_KEYS.has(key.toUpperCase())) {
      if (await updateEnv(existingId, key, value)) {
        console.log(`~ ${key} (actualizada)`);
        updated++;
      } else {
        skipped++;
      }
    } else {
      console.log(`= ${key} (ya existe en Vercel)`);
      skipped++;
    }
    continue;
  }
  if (await addEnv(key, value)) {
    console.log(`+ ${key} (agregada)`);
    added++;
  } else {
    skipped++;
  }
}

console.log(`\nListo. Agregadas: ${added} · actualizadas: ${updated} · sin cambios: ${skipped}.`);
if (added > 0 || updated > 0) {
  console.log("Nota: las env vars nuevas/actualizadas aplican al PRÓXIMO deploy. Redeployá para tomarlas.");
}
