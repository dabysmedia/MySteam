const IGN_BASE = "https://www.ign.com";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MySteam/1.0; +https://github.com/)",
  Accept: "text/html",
};

export interface IgnGuideLink {
  label: string;
  url: string;
}

export interface IgnGuidesResult {
  slug: string;
  wikiUrl: string;
  links: IgnGuideLink[];
}

/** IGN wiki slugs: lowercase, hyphens, colons usually become spaces. */
export function ignWikiSlugCandidates(gameName: string): string[] {
  const clean = (s: string) =>
    s
      .replace(/[™®©]/g, "")
      .replace(/[''']/g, "")
      .replace(/:\s*/g, " ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");

  const candidates = new Set<string>();
  const add = (name: string) => {
    const slug = clean(name);
    if (slug) candidates.add(slug);
  };

  add(gameName);

  if (gameName.includes(":")) {
    add(gameName.split(":")[0].trim());
    add(gameName.replace(":", "").trim());
  }

  const noEdition = gameName
    .replace(
      /\s*[-–—]\s*(gold|goty|game of the year|definitive|complete|ultimate|deluxe|premium|enhanced|remastered|remake)\s*edition.*$/i,
      ""
    )
    .trim();
  if (noEdition !== gameName) add(noEdition);

  return [...candidates];
}

function pageSlugToLabel(pageSlug: string): string {
  return decodeURIComponent(pageSlug).replace(/_/g, " ").trim();
}

const PRIORITY_PAGES: { test: (slug: string) => boolean; label?: string }[] = [
  { test: (s) => /^walkthrough$/i.test(s), label: "Walkthrough" },
  { test: (s) => /beginners?_guide/i.test(s), label: "Beginner's Guide" },
  { test: (s) => /tips_and_tricks/i.test(s), label: "Tips & Tricks" },
  { test: (s) => /^how-to/i.test(s), label: "How-To Guides" },
  { test: (s) => /boss_guides?/i.test(s), label: "Boss Guides" },
  { test: (s) => /collectibles/i.test(s), label: "Collectibles Guide" },
  { test: (s) => /side_missions?/i.test(s), label: "Side Missions" },
  { test: (s) => /cheats_and_secrets/i.test(s), label: "Cheats & Secrets" },
];

function parseWikiGuidePaths(html: string, wikiSlug: string): string[] {
  const pattern = new RegExp(`href="(/wikis/${wikiSlug}/[^"#?]+)"`, "gi");
  const paths = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    paths.add(match[1]);
  }
  return [...paths];
}

function buildGuideLinks(wikiSlug: string, paths: string[]): IgnGuideLink[] {
  const wikiUrl = `${IGN_BASE}/wikis/${wikiSlug}`;
  const pageMap = new Map<string, string>();

  for (const path of paths) {
    const pageSlug = path.split("/").pop()!;
    if (!pageSlug || pageSlug === wikiSlug) continue;
    pageMap.set(pageSlug, `${IGN_BASE}${path}`);
  }

  const links: IgnGuideLink[] = [];
  const used = new Set<string>();

  for (const { test, label } of PRIORITY_PAGES) {
    for (const [pageSlug, url] of pageMap) {
      if (!test(pageSlug) || used.has(url)) continue;
      links.push({ label: label ?? pageSlugToLabel(pageSlug), url });
      used.add(url);
      break;
    }
  }

  links.unshift({ label: "IGN Wiki", url: wikiUrl });
  used.add(wikiUrl);

  const extras = [...pageMap.entries()]
    .filter(([, url]) => !used.has(url))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([pageSlug, url]) => ({ label: pageSlugToLabel(pageSlug), url }));

  return [...links, ...extras].slice(0, 10);
}

async function fetchWikiHtml(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${IGN_BASE}/wikis/${slug}`, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchIgnGuides(gameName: string): Promise<IgnGuidesResult | null> {
  const trimmed = gameName.trim();
  if (!trimmed) return null;

  for (const slug of ignWikiSlugCandidates(trimmed)) {
    const html = await fetchWikiHtml(slug);
    if (!html) continue;

    const paths = parseWikiGuidePaths(html, slug);
    const links = buildGuideLinks(slug, paths);

    return {
      slug,
      wikiUrl: `${IGN_BASE}/wikis/${slug}`,
      links,
    };
  }

  return null;
}
