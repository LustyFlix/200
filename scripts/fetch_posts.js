const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const FLARESOLVERR_URL = "https://mabelle-supervenient-talitha.ngrok-free.dev/v1";

const SITEMAP_URLS = [
'https://missav.ws/sitemap_items_151.xml',
'https://missav.ws/sitemap_items_152.xml',
'https://missav.ws/sitemap_items_153.xml',
'https://missav.ws/sitemap_items_154.xml',
'https://missav.ws/sitemap_items_155.xml',
'https://missav.ws/sitemap_items_156.xml',
'https://missav.ws/sitemap_items_157.xml',
'https://missav.ws/sitemap_items_158.xml',
'https://missav.ws/sitemap_items_159.xml',
'https://missav.ws/sitemap_items_160.xml',
'https://missav.ws/sitemap_items_161.xml',
'https://missav.ws/sitemap_items_162.xml',
'https://missav.ws/sitemap_items_163.xml',
'https://missav.ws/sitemap_items_164.xml',
'https://missav.ws/sitemap_items_165.xml',
'https://missav.ws/sitemap_items_166.xml',
'https://missav.ws/sitemap_items_167.xml',
'https://missav.ws/sitemap_items_168.xml',
'https://missav.ws/sitemap_items_169.xml',
'https://missav.ws/sitemap_items_170.xml',
'https://missav.ws/sitemap_items_171.xml',
'https://missav.ws/sitemap_items_172.xml',
'https://missav.ws/sitemap_items_173.xml',
'https://missav.ws/sitemap_items_174.xml',
'https://missav.ws/sitemap_items_175.xml',
'https://missav.ws/sitemap_items_176.xml',
'https://missav.ws/sitemap_items_177.xml',
'https://missav.ws/sitemap_items_178.xml',
'https://missav.ws/sitemap_items_179.xml',
'https://missav.ws/sitemap_items_180.xml',
'https://missav.ws/sitemap_items_181.xml',
'https://missav.ws/sitemap_items_182.xml',
'https://missav.ws/sitemap_items_183.xml',
'https://missav.ws/sitemap_items_184.xml',
'https://missav.ws/sitemap_items_185.xml',
'https://missav.ws/sitemap_items_186.xml',
'https://missav.ws/sitemap_items_187.xml',
'https://missav.ws/sitemap_items_188.xml',
'https://missav.ws/sitemap_items_189.xml',
'https://missav.ws/sitemap_items_190.xml',
'https://missav.ws/sitemap_items_191.xml',
'https://missav.ws/sitemap_items_192.xml',
'https://missav.ws/sitemap_items_193.xml',
'https://missav.ws/sitemap_items_194.xml',
'https://missav.ws/sitemap_items_195.xml',
'https://missav.ws/sitemap_items_196.xml',
'https://missav.ws/sitemap_items_197.xml',
'https://missav.ws/sitemap_items_198.xml',
'https://missav.ws/sitemap_items_199.xml',
'https://missav.ws/sitemap_items_200.xml'
];

const POSTS_DIR = path.join(__dirname, "../data/posts");
const INDEX_DIR = path.join(__dirname, "../data/index");
const META_DIR = path.join(__dirname, "../data/meta");

[POSTS_DIR, INDEX_DIR, META_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- FETCH ----------
async function fetchWithFlareSolverr(url) {
  const res = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout: 60000
    })
  });

  const data = await res.json();
  if (!data.solution) throw new Error("FlareSolverr failed");

  return data.solution.response;
}

async function smartFetch(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {}

  console.log("⚡ FlareSolverr:", url);
  return await fetchWithFlareSolverr(url);
}

// ---------- SITEMAP ----------
async function fetchSitemap(url) {
  const xml = await smartFetch(url);
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);

  return result.urlset.url.map(u => {
    if (u["xhtml:link"]) {
      const en = u["xhtml:link"].find(x => x.$.hreflang === "en");
      return en ? en.$.href : null;
    }
    return null;
  }).filter(Boolean);
}

// ---------- HELPERS ----------
function getKey(url) {
  const match = url.match(/([a-z0-9\-]+)$/i);
  return match ? match[1].toLowerCase() : "unknown";
}

function getIndexFile(key) {
  return path.join(INDEX_DIR, key[0] + ".json");
}

// function getMetaFile(key) {
//   return path.join(META_DIR, key[0] + ".json");
// }

function slugFromUrl(url) {
  // Clean URL
  const clean = url
    .replace(/https?:\/\/[^\/]+\//, "")
    .replace(/\/$/, "");

  // Split parts
  const parts = clean.split("/");

  // ✅ Detect language (common langs)
  const langs = ["en", "cn", "zh", "ja", "ko", "ms", "th", "de", "fr", "vi", "id", "fil", "pt"];

  let lang = "xx";
  for (const p of parts) {
    if (langs.includes(p)) {
      lang = p;
      break;
    }
  }

  // ✅ Always take LAST part as ID
  const id = parts[parts.length - 1] || "unknown";

  // ✅ Clean filename
  const safeId = id.replace(/[^a-z0-9\-]/gi, "").toLowerCase();
  const slug = `${lang}-${safeId}.html`;

  // 🔥 SMART SHARDING (works for ANY id format)
  const level1 = safeId.slice(0, 2) || "00";
  const level2 = safeId.slice(2, 4) || "00";
  const level3 = safeId.slice(4, 6) || "00";

  const dir = path.join(POSTS_DIR, lang, level1, level2, level3);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(lang, level1, level2, level3, slug);
}

// ---------- MAIN DOWNLOAD ----------
async function downloadPost(url) {
  try {
    const key = getKey(url);
    const indexFile = getIndexFile(key);

    // skip if exists
    if (fs.existsSync(indexFile)) {
      const data = JSON.parse(fs.readFileSync(indexFile));
      if (data[key]) {
        console.log("⏩ Skip:", key);
        return;
      }
    }

    const html = await smartFetch(url);

    const relativePath = slugFromUrl(url);
    const filePath = path.join(POSTS_DIR, relativePath);

    fs.writeFileSync(filePath, html);

    // INDEX
    let idx = {};
    if (fs.existsSync(indexFile)) {
      try { idx = JSON.parse(fs.readFileSync(indexFile)); } catch {}
    }
    idx[key] = relativePath;
    fs.writeFileSync(indexFile, JSON.stringify(idx));

    // META
    // const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || key;
    // const image = (html.match(/og:image" content="(.*?)"/i) || [])[1] || null;

    // const metaFile = getMetaFile(key);
    // let meta = {};
    // if (fs.existsSync(metaFile)) {
    //   try { meta = JSON.parse(fs.readFileSync(metaFile)); } catch {}
    // }

    // meta[key] = { title, image, path: relativePath };
    // fs.writeFileSync(metaFile, JSON.stringify(meta));

    console.log("✅ Saved:", key);

  } catch (err) {
    console.error("❌ Error:", url, err.message);
  }
}

// ---------- RUN ----------
(async () => {
  for (const sitemap of SITEMAP_URLS) {
    console.log("📄", sitemap);
    const urls = await fetchSitemap(sitemap);

    const BATCH = 3;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.all(urls.slice(i, i + BATCH).map(downloadPost));
    }
  }
})();
