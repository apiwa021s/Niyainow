import { AwsClient } from "aws4fetch";

const ALLOWED_PREFIXES = [
  "avatars/",
  "banners/",
  "covers/",
  "novels/assets/",
  "og/",
];
const DEFAULT_CACHE_TTL_SECONDS = 31_536_000;

function noStoreResponse(status, statusText) {
  return new Response(null, {
    status,
    statusText,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function classifyRequest(request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return { response: noStoreResponse(405, "Method Not Allowed") };
  }

  const url = new URL(request.url);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return { response: noStoreResponse(400, "Bad Request") };
  }

  if (decodedPath === "staging" || decodedPath.startsWith("staging/")) {
    return { response: noStoreResponse(403, "Forbidden") };
  }
  if (!ALLOWED_PREFIXES.some((prefix) => decodedPath.startsWith(prefix))) {
    return { response: noStoreResponse(404, "Not Found") };
  }
  if (decodedPath.endsWith("/")) {
    return { response: noStoreResponse(404, "Not Found") };
  }

  return { path: decodedPath, url };
}

function requiredBinding(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing Worker binding: ${name}`);
  }
  return value.trim();
}

function cacheTtl(env) {
  const parsed = Number.parseInt(env.CACHE_TTL_SECONDS ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CACHE_TTL_SECONDS;
}

function responseHeaders(originHeaders, status, ttlSeconds) {
  const headers = new Headers(originHeaders);
  headers.delete("set-cookie");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  headers.set("Access-Control-Allow-Origin", "*");

  if (status >= 200 && status < 300) {
    const cacheControl = `public, max-age=${ttlSeconds}, immutable`;
    headers.set("Cache-Control", cacheControl);
    headers.set("Cloudflare-CDN-Cache-Control", cacheControl);
  } else {
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  }

  return headers;
}

function clientResponse(originResponse, requestMethod, ttlSeconds) {
  const isHead = requestMethod === "HEAD";
  if (isHead) void originResponse.body?.cancel();

  return new Response(isHead ? null : originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders(originResponse.headers, originResponse.status, ttlSeconds),
  });
}

export default {
  async fetch(request, env) {
    const classified = classifyRequest(request);
    if (classified.response) return classified.response;

    try {
      const endpoint = requiredBinding(env, "B2_ENDPOINT");
      const bucketName = requiredBinding(env, "BUCKET_NAME").toLowerCase();
      const accessKeyId = requiredBinding(env, "B2_APPLICATION_KEY_ID");
      const secretAccessKey = requiredBinding(env, "B2_APPLICATION_KEY");
      const ttlSeconds = cacheTtl(env);

      const originUrl = new URL(classified.url);
      originUrl.protocol = "https:";
      originUrl.port = "443";
      originUrl.hostname = `${bucketName}.${endpoint}`;
      originUrl.pathname = `/${classified.path}`;
      originUrl.search = "";

      const headers = new Headers();
      const range = request.headers.get("range");
      if (range) headers.set("range", range);

      const signer = new AwsClient({
        accessKeyId,
        secretAccessKey,
        service: "s3",
      });
      // Sign HEAD requests as GET. Cloudflare may turn an upstream HEAD into a
      // GET, which would otherwise invalidate the AWS v4 signature.
      const signedRequest = await signer.sign(originUrl.toString(), {
        method: "GET",
        headers,
      });
      const originResponse = await fetch(signedRequest, {
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: {
            "200-299": ttlSeconds,
            "300-399": 0,
            "400-499": 0,
            "500-599": 0,
          },
        },
      });

      return clientResponse(originResponse, request.method, ttlSeconds);
    } catch (error) {
      console.error("B2 CDN origin request failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown failure",
      });
      return noStoreResponse(502, "Bad Gateway");
    }
  },
};
