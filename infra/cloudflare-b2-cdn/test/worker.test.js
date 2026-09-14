import assert from "node:assert/strict";
import test from "node:test";

import { classifyRequest } from "../src/index.js";

test("allows only approved final media prefixes", () => {
  for (const path of [
    "/covers/id.webp",
    "/banners/id.png",
    "/avatars/id.jpg",
    "/novels/assets/id.avif",
    "/og/id.png",
  ]) {
    const result = classifyRequest(new Request(`https://images.novelnow.co${path}`));
    assert.equal(result.response, undefined);
  }
});

test("blocks staging including percent-encoded paths without caching", async () => {
  for (const path of ["/staging/covers/id.webp", "/staging%2Fcovers%2Fid.webp"]) {
    const result = classifyRequest(new Request(`https://images.novelnow.co${path}`));
    assert.equal(result.response?.status, 403);
    assert.match(result.response?.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("rejects bucket listing, unknown prefixes, and write methods", () => {
  assert.equal(classifyRequest(new Request("https://images.novelnow.co/")).response?.status, 404);
  assert.equal(classifyRequest(new Request("https://images.novelnow.co/private/file")).response?.status, 404);
  assert.equal(classifyRequest(new Request("https://images.novelnow.co/covers/id.webp", { method: "PUT" })).response?.status, 405);
});
