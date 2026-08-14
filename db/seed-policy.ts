export function assertDevelopmentSeedAllowed(
  source: Record<string, string | undefined> = process.env,
) {
  if (source.NODE_ENV === "production" || source.ALLOW_DEVELOPMENT_SEED !== "true") {
    throw new Error(
      "Development seed is disabled. Set ALLOW_DEVELOPMENT_SEED=true explicitly in a non-production environment.",
    );
  }
}
