#!/usr/bin/env node
/**
 * Comparaison automatique des flux RSS entre la version précédente
 * (snapshot enregistré) et la version en ligne.
 *
 * Détecte les changements *inattendus* :
 *   - GUID modifié pour un item déjà publié (casse les abonnements)
 *   - lien canonique modifié pour un GUID existant
 *   - pubDate modifiée pour un GUID existant (remonte à tort dans les agrégateurs)
 *   - item disparu du flux alors qu'il n'est pas sorti de la fenêtre (50 items)
 *   - GUID dupliqué, ou GUID ≠ lien canonique
 *
 * Les nouveaux items sont normaux et ne déclenchent aucune alerte.
 *
 * Usage :
 *   node scripts/rss-diff.mjs                 # compare au snapshot
 *   node scripts/rss-diff.mjs --update        # (re)génère le snapshot de référence
 *   RSS_BASE_URL=http://localhost:8080 node scripts/rss-diff.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const FEEDS = [
  "/rss.xml",
  "/rss-chroniques.xml",
  "/rss-actus.xml",
  "/rss-clips.xml",
  "/rss-magazine.xml",
  "/rss-coups-de-coeur.xml",
  "/podcast.xml",
];

const PROD = "https://www.radio.indi-art-culture.com";
const BASE = (process.env.RSS_BASE_URL ?? process.env.CHECK_BASE_URL ?? PROD).replace(/\/$/, "");
const SNAPSHOT = path.join(process.cwd(), ".rss-snapshots", "feeds.json");
const UPDATE = process.argv.includes("--update");
/** Fenêtre du flux : au-delà, la disparition d'un item est normale. */
const FEED_LIMIT = 50;

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1].trim()) : "";
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

async function fetchFeed(feedPath) {
  const res = await fetch(`${BASE}${feedPath}`, {
    redirect: "follow",
    headers: { "user-agent": "indi-rss-diff/1.0", "cache-control": "no-cache" },
  });
  if (!res.ok) throw new Error(`${feedPath} → HTTP ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, block]) => ({
    guid: tag(block, "guid"),
    link: tag(block, "link"),
    title: tag(block, "title"),
    pubDate: tag(block, "pubDate"),
  }));
  return { items };
}

async function snapshotAll() {
  const out = {};
  for (const feedPath of FEEDS) {
    out[feedPath] = await fetchFeed(feedPath);
  }
  return { base: BASE, generatedAt: new Date().toISOString(), feeds: out };
}

const problems = [];
const notes = [];
const fail = (feed, msg) => problems.push(`${feed} — ${msg}`);

const current = await snapshotAll();

// Contrôles internes, valables même sans snapshot précédent.
for (const [feed, { items }] of Object.entries(current.feeds)) {
  const seen = new Map();
  for (const item of items) {
    if (!item.guid) fail(feed, `item sans GUID : "${item.title}"`);
    if (item.guid && item.link && item.guid !== item.link) {
      fail(feed, `GUID ≠ lien pour "${item.title}" (${item.guid} vs ${item.link})`);
    }
    if (item.guid && seen.has(item.guid)) fail(feed, `GUID dupliqué : ${item.guid}`);
    if (item.guid) seen.set(item.guid, item);
    if (item.pubDate && Number.isNaN(Date.parse(item.pubDate))) {
      fail(feed, `date illisible pour "${item.title}" : ${item.pubDate}`);
    }
  }
}

if (UPDATE || !existsSync(SNAPSHOT)) {
  await mkdir(path.dirname(SNAPSHOT), { recursive: true });
  await writeFile(SNAPSHOT, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(
    `[rss-diff] snapshot de référence ${UPDATE ? "mis à jour" : "créé"} → .rss-snapshots/feeds.json (${BASE})`,
  );
} else {
  const previous = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  for (const [feed, { items }] of Object.entries(current.feeds)) {
    const before = previous.feeds?.[feed]?.items ?? [];
    if (!previous.feeds?.[feed]) {
      notes.push(`${feed} — nouveau flux, aucune référence à comparer`);
      continue;
    }
    const nowByGuid = new Map(items.map((i) => [i.guid, i]));
    const nowByTitle = new Map(items.map((i) => [i.title, i]));

    before.forEach((old, index) => {
      const still = nowByGuid.get(old.guid);
      if (!still) {
        const renamedGuid = nowByTitle.get(old.title);
        if (renamedGuid) {
          fail(feed, `GUID changé pour "${old.title}" : ${old.guid} → ${renamedGuid.guid}`);
        } else if (index < FEED_LIMIT - 5) {
          fail(feed, `item disparu du flux : "${old.title}" (${old.guid})`);
        } else {
          notes.push(`${feed} — "${old.title}" sorti de la fenêtre du flux`);
        }
        return;
      }
      if (old.link && still.link && old.link !== still.link) {
        fail(feed, `lien changé pour "${old.title}" : ${old.link} → ${still.link}`);
      }
      if (old.pubDate && still.pubDate && old.pubDate !== still.pubDate) {
        fail(feed, `pubDate changée pour "${old.title}" : ${old.pubDate} → ${still.pubDate}`);
      }
    });

    const added = items.filter((i) => !before.some((o) => o.guid === i.guid));
    if (added.length) notes.push(`${feed} — ${added.length} nouvel(s) item(s) (normal)`);
  }
}

for (const n of notes) console.log(`[rss-diff] ℹ️  ${n}`);

if (problems.length) {
  console.error(`\n[rss-diff] ❌ ${problems.length} changement(s) inattendu(s) détecté(s) :`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error(
    "\nSi ces changements sont volontaires, valide-les avec : bun run verify:rss-diff:update",
  );
  process.exit(1);
}

console.log(`[rss-diff] ✅ flux RSS stables sur ${BASE} (GUID, dates et liens inchangés)`);