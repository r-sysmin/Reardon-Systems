#!/usr/bin/env node
/**
 * Shared Vault KV v2 helpers for Reardon-Systems secret materialization.
 * Talks to the Vault HTTP API (no vault CLI required at runtime).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const ENV_PATH = path.join(ROOT, ".env");

export function appEnv() {
  return {
    app: process.env.APP || "reardon-systems",
    env: process.env.ENV || "prod",
    mount: process.env.VAULT_KV_MOUNT || "secret",
  };
}

export function stripePath() {
  const { app, env } = appEnv();
  return `apps/${app}/${env}/stripe`;
}

export function webhooksPath() {
  const { app, env } = appEnv();
  return `apps/${app}/${env}/webhooks`;
}

export function vaultAddr() {
  const addr = (process.env.VAULT_ADDR || "").replace(/\/$/, "");
  if (!addr) {
    throw new Error(
      "VAULT_ADDR is required (e.g. http://127.0.0.1:8200). See docs/secrets-vault.md",
    );
  }
  return addr;
}

/** Fallback: a raw token from the environment or a token file. */
export function vaultToken() {
  if (process.env.VAULT_TOKEN) return process.env.VAULT_TOKEN.trim();
  const home = process.env.HOME || "";
  const candidates = [
    path.join(ROOT, ".vault-token"),
    path.join(home, ".vault-token"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8").trim();
    }
  }
  return null;
}

/**
 * AppRole credentials for the current ENV, from env vars or a JSON file
 * (`VAULT_APPROLE_FILE`, default `~/.vault-approle.json`):
 *   { "approle": { "prod": { "role_id": "...", "secret_id": "..." },
 *                  "dev":  { "role_id": "...", "secret_id": "..." } } }
 */
/**
 * Optional fallback: read AppRole creds from the Bitwarden (Vaultwarden) CLI.
 * Enabled when BW_SESSION (or a 600 session file) is available. The vault item
 * is named `reardon-systems-vault-approle-<env>` and holds a login whose
 * username is role_id and whose notes contain the JSON { "secret_id": "..." }.
 */
function approleCredsFromBitwarden() {
  const home = process.env.HOME || "";
  const sessionFile = path.join(home, ".bw-session");
  let session = (process.env.BW_SESSION || "").trim();
  if (!session && fs.existsSync(sessionFile)) {
    session = fs.readFileSync(sessionFile, "utf8").trim();
  }
  if (!session) return null;
  const { env } = appEnv();
  const itemName = `reardon-systems-vault-approle-${env}`;
  try {
    const raw = execFileSync(
      "bw",
      ["get", "item", itemName, "--session", session, "--raw"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const item = JSON.parse(raw);
    const role_id =
      item?.login?.username ||
      item?.fields?.find((f) => f.name === "role_id")?.value;
    let secret_id = item?.fields?.find((f) => f.name === "secret_id")?.value;
    if (!secret_id && item?.notes) {
      try {
        secret_id = JSON.parse(item.notes)?.secret_id;
      } catch {
        /* notes not JSON */
      }
    }
    if (role_id && secret_id) return { role_id, secret_id };
  } catch {
    /* bw unavailable / item missing / not unlocked */
  }
  return null;
}

function approleCreds() {
  if (process.env.VAULT_ROLE_ID && process.env.VAULT_SECRET_ID) {
    return {
      role_id: process.env.VAULT_ROLE_ID,
      secret_id: process.env.VAULT_SECRET_ID,
    };
  }
  const home = process.env.HOME || "";
  const file =
    process.env.VAULT_APPROLE_FILE || path.join(home, ".vault-approle.json");
  if (fs.existsSync(file)) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      parsed = null;
    }
    const byEnv = parsed?.approle || {};
    const { env } = appEnv();
    const entry = byEnv[env] || byEnv.prod || Object.values(byEnv)[0];
    if (entry?.role_id && entry?.secret_id) return entry;
  }
  return approleCredsFromBitwarden();
}

let cachedToken = null;

/** Resolve an auth token: VAULT_TOKEN, else AppRole login, else token file. */
async function resolveToken() {
  if (cachedToken) return cachedToken;
  if (process.env.VAULT_TOKEN) {
    cachedToken = process.env.VAULT_TOKEN.trim();
    return cachedToken;
  }
  const creds = approleCreds();
  if (creds) {
    try {
      const res = await fetch(`${vaultAddr()}/v1/auth/approle/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (res.ok) {
        cachedToken = (await res.json())?.auth?.client_token || null;
        if (cachedToken) return cachedToken;
      }
    } catch {
      /* fall through to token file */
    }
  }
  const t = vaultToken();
  if (t) {
    cachedToken = t;
    return cachedToken;
  }
  throw new Error(
    "No Vault auth. Set VAULT_TOKEN, or provide AppRole creds via " +
      "VAULT_ROLE_ID/VAULT_SECRET_ID or ~/.vault-approle.json. " +
      "See docs/secrets-vault.md",
  );
}

async function vaultHeaders() {
  const headers = {
    "X-Vault-Token": await resolveToken(),
    "Content-Type": "application/json",
  };
  if (process.env.VAULT_NAMESPACE) {
    headers["X-Vault-Namespace"] = process.env.VAULT_NAMESPACE;
  }
  return headers;
}

function kvDataUrl(logicalPath) {
  const { mount } = appEnv();
  const clean = logicalPath.replace(/^\/+/, "");
  return `${vaultAddr()}/v1/${mount}/data/${clean}`;
}

export async function kvRead(logicalPath) {
  const res = await fetch(kvDataUrl(logicalPath), {
    headers: await vaultHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vault read ${logicalPath}: ${res.status} ${body}`);
  }
  const json = await res.json();
  return json?.data?.data ?? null;
}

export async function kvWrite(logicalPath, data, { merge = false } = {}) {
  let payload = data;
  if (merge) {
    const existing = (await kvRead(logicalPath)) || {};
    payload = { ...existing, ...data };
  }
  const res = await fetch(kvDataUrl(logicalPath), {
    method: "POST",
    headers: await vaultHeaders(),
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vault write ${logicalPath}: ${res.status} ${body}`);
  }
  return (await res.json())?.data;
}

/** Parse KEY=VALUE .env (simple; supports optional quotes). */
export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function readLocalEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return parseEnvFile(fs.readFileSync(ENV_PATH, "utf8"));
}

function escapeEnvValue(val) {
  const s = String(val ?? "");
  if (/[\s#"']/.test(s) || s.includes("\\")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

/** Atomic write of .env from ordered key/value pairs + optional header comments. */
export function writeEnvAtomic(entries, headerLines = []) {
  const lines = [...headerLines];
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      lines.push(`${key}=`);
      continue;
    }
    lines.push(`${key}=${escapeEnvValue(value)}`);
  }
  lines.push("");
  const tmp = `${ENV_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, lines.join("\n"), { mode: 0o600 });
  fs.renameSync(tmp, ENV_PATH);
  try {
    fs.chmodSync(ENV_PATH, 0o600);
  } catch {
    /* ignore on platforms that don't support chmod */
  }
}

export const PRESERVE_LOCAL_KEYS = ["PUBLIC_SPECOPS_BETA"];
