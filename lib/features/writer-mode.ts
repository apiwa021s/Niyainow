import { getRuntimeEnv } from "@/lib/env";

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isWriterModeEnabled(source: NodeJS.ProcessEnv = process.env) {
  return getRuntimeEnv(source).WRITER_MODE_ENABLED;
}

export function isWriterModePagePath(pathname: string) {
  return matchesRoute(pathname, "/studio") || matchesRoute(pathname, "/creators/apply");
}

export function isWriterModeApiPath(pathname: string) {
  return matchesRoute(pathname, "/api/studio");
}
