import type { APIRoute } from "astro";
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

// Local landing spot for waitlist submissions. `.data/` is gitignored and is
// the same directory used for other local fulfillment logs. Swap for a real
// DB/CRM when the API runs under Node in production.
const DATA_DIR = path.join(process.cwd(), ".data");
const INBOX = path.join(DATA_DIR, "waitlist.ndjson");
const UPLOADS = path.join(DATA_DIR, "waitlist-uploads");

const REDIRECT_OK = "/products/specops?waitlist=success#access";
const REDIRECT_ERR = "/products/specops?waitlist=error#access";

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/**
 * Cohort 2 waitlist. Accepts the multipart form from
 * `src/pages/products/specops.astro`, records the submission, and stores any
 * optional template/report files. Redirects back to the page with a status flag.
 */
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(REDIRECT_ERR);
  }

  const str = (k: string) => (form.get(k) ?? "").toString().trim();
  const name = str("name");
  const email = str("email");
  const company = str("company");
  const currentSoftware = str("current_software");
  const migrationNotes = str("migration_notes");

  if (!name || !email || !email.includes("@")) {
    return redirect(REDIRECT_ERR);
  }

  const id = `${Date.now()}-${slug(company || name) || "request"}`;
  const files: string[] = [];

  for (const field of ["template_file", "report_file"]) {
    const entry = form.get(field);
    if (entry && typeof entry !== "string" && entry.size > 0) {
      const dir = path.join(UPLOADS, id);
      await mkdir(dir, { recursive: true });
      const safe = path.basename(entry.name || field);
      await writeFile(path.join(dir, safe), Buffer.from(await entry.arrayBuffer()));
      files.push(`${field}:${safe}`);
    }
  }

  const record = {
    receivedAt: new Date().toISOString(),
    id,
    name,
    email,
    company,
    currentSoftware,
    migrationNotes,
    files,
    filesDir: files.length ? path.relative(process.cwd(), path.join(UPLOADS, id)) : null,
    source: "specops-waitlist",
  };

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(INBOX, JSON.stringify(record) + "\n");
  } catch {
    return redirect(REDIRECT_ERR);
  }

  return redirect(REDIRECT_OK);
};
