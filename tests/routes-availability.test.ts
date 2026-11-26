import { describe, it, expect } from "vitest";

const TARGETS = [
  { name: "local", url: process.env.CHECK_BASE_URL ?? "http://localhost:8080" },
  { name: "production", url: "https://www.radio.indi-art-culture.com" },
];

const PATHS = ["/", "/index"];

async function fetchWithTimeout(url: string, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "indi-routes-availability-test/1.0" },
    });
  } finally {
    clearTimeout(t);
  }
}

describe("Route availability (/ and /index)", () => {
  for (const target of TARGETS) {
    for (const path of PATHS) {
      it(`${target.name} ${path} responds with HTML content (not 404)`, async () => {
        const res = await fetchWithTimeout(target.url + path);
        expect(res.status, `status for ${target.name}${path}`).toBeLessThan(400);
        const body = await res.text();
        expect(body.length, "response body length").toBeGreaterThan(200);
        expect(body, "should not be a 404 page").not.toMatch(/not\s*found/i);
        expect(body).toMatch(/<html/i);
        expect(body).toMatch(/<\/body>/i);
      }, 20000);
    }
  }
});
