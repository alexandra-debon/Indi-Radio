import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER = "notify.radio.indi-art-culture.com";
const ROOT = "radio.indi-art-culture.com";
const EXPECTED_NS = ["ns5.lovable.cloud", "ns6.lovable.cloud"];
const EXPECTED_TXT_HOST = `_lovable-email.${ROOT}`;
const EXPECTED_TXT_PREFIX = "lovable_email_verify=";

async function doh(name: string, type: "NS" | "TXT" | "A" | "MX"): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/dns-json" } });
    if (!r.ok) return [];
    const j: any = await r.json();
    return (j.Answer ?? [])
      .filter((a: any) => a.type === typeCode(type))
      .map((a: any) => String(a.data).replace(/^"|"$/g, "").replace(/\.$/, "").toLowerCase());
  } catch {
    return [];
  }
}

function typeCode(t: string) {
  return { A: 1, TXT: 16, MX: 15, NS: 2 }[t] ?? 0;
}

function norm(s: string) {
  return s.replace(/^"|"$/g, "").trim().toLowerCase();
}

export const checkEmailDns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const [nsFound, txtFound] = await Promise.all([
      doh(SENDER, "NS"),
      doh(EXPECTED_TXT_HOST, "TXT"),
    ]);

    const expectedNsSet = EXPECTED_NS.map((s) => s.toLowerCase());
    const nsOk = expectedNsSet.every((e) => nsFound.includes(e));

    const txtNorm = txtFound.map(norm);
    const txtOk = txtNorm.some((t) => t.startsWith(EXPECTED_TXT_PREFIX));

    return {
      checkedAt: new Date().toISOString(),
      sender: SENDER,
      ns: { expected: EXPECTED_NS, found: nsFound, ok: nsOk },
      txt: { host: EXPECTED_TXT_HOST, expectedPrefix: EXPECTED_TXT_PREFIX, found: txtFound, ok: txtOk },
      allOk: nsOk && txtOk,
    };
  });
