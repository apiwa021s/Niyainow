const requiredNames = ["DATABASE_URL", "AI_TRANSLATION_API_KEY"];
const missingNames = requiredNames.filter((name) => !process.env[name]?.trim());

function fail(message) {
  if (process.env.GITHUB_ACTIONS === "true") {
    console.error(`::error title=Translation worker configuration error::${message}`);
  }
  throw new Error(message);
}

if (missingNames.length > 0) {
  fail(
    `Missing required secrets: ${missingNames.join(", ")}. `
      + "Add them to the GitHub production environment; Vercel environment variables are not shared with GitHub Actions.",
  );
}

let databaseUrl;
try {
  databaseUrl = new URL(process.env.DATABASE_URL);
} catch {
  fail("DATABASE_URL is not a valid URL in the GitHub production environment.");
}

if (databaseUrl.protocol !== "postgres:" && databaseUrl.protocol !== "postgresql:") {
  fail("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
}

console.info(JSON.stringify({
  event: "translation_worker_environment_ready",
  runtime: process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "local",
  revision: process.env.GITHUB_SHA ?? null,
  requiredSecretsPresent: requiredNames,
}));
