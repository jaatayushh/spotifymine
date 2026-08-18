var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_stream = require("stream");

// api/_lib/hf.ts
var HF_USER = "CoolJaat";
var HF_REPO = "my-music-library";
var AUDIO_EXTS = [".mp3", ".wav", ".m4a", ".ogg", ".flac"];
function formatWords(str) {
  if (!str) return "";
  return str.split(" ").filter(Boolean).map((word) => {
    if (/^[0-9]+$/.test(word) || word.toUpperCase() === word && word.length <= 3) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}
function parseBasic(path2) {
  const filename = path2.split("/").pop() || path2;
  const basename = filename.replace(/\.(mp3|wav|m4a|ogg|flac)$/i, "");
  const cleanStr = basename.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (cleanStr.includes(" - ")) {
    const parts = cleanStr.split(" - ");
    const title = formatWords(parts[0].trim());
    const artist = formatWords(parts.slice(1).join(" - ").trim());
    return { title: title || "Untitled Track", artist: artist || "CoolJaat" };
  }
  if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-");
    const title = formatWords(parts[0].trim());
    const artist = formatWords(parts.slice(1).join("-").trim());
    return { title: title || "Untitled Track", artist: artist || "CoolJaat" };
  }
  return { title: formatWords(cleanStr) || "Untitled Track", artist: "CoolJaat" };
}
async function fetchWithTimeout(url, timeoutMs = 6e3) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function fetchFullTree(user = HF_USER, repo = HF_REPO) {
  const buildUrl = (query) => `https://huggingface.co/api/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/tree/main${query}`;
  let url = buildUrl("?recursive=true");
  let all = [];
  let triedSimpleFallback = false;
  let pageCount = 0;
  const MAX_PAGES = 200;
  const TIME_BUDGET_MS = 8e3;
  const startedAt = Date.now();
  while (url && pageCount < MAX_PAGES) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      console.warn(`HF tree pagination hit its time budget after ${pageCount} page(s); returning ${all.length} entries collected so far.`);
      break;
    }
    pageCount++;
    let response;
    try {
      response = await fetchWithTimeout(url);
    } catch (networkErr) {
      console.error("HF tree fetch failed mid-pagination:", networkErr);
      break;
    }
    if (!response.ok && all.length === 0 && !triedSimpleFallback) {
      triedSimpleFallback = true;
      url = buildUrl("");
      try {
        response = await fetchWithTimeout(url);
      } catch (networkErr) {
        console.error("HF tree simple-fallback fetch failed:", networkErr);
        break;
      }
    }
    if (!response.ok) {
      if (all.length > 0) break;
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }
    let page;
    try {
      page = await response.json();
    } catch (parseErr) {
      console.error("HF tree page wasn't valid JSON:", parseErr);
      break;
    }
    if (!Array.isArray(page)) break;
    all = all.concat(page);
    let nextUrl = null;
    const linkHeader = response.headers.get("link") || response.headers.get("Link");
    if (linkHeader) {
      const nextMatch = /<([^>]+)>\s*;\s*rel="next"/.exec(linkHeader);
      if (nextMatch) {
        try {
          nextUrl = new URL(nextMatch[1], "https://huggingface.co").toString();
        } catch {
          nextUrl = null;
        }
      }
    }
    url = nextUrl;
  }
  console.log(`HF tree fetch: ${pageCount} page(s), ${all.length} total entries, ${Date.now() - startedAt}ms`);
  return all;
}
async function fetchLibrary(user = HF_USER, repo = HF_REPO) {
  const data = await fetchFullTree(user, repo);
  if (!Array.isArray(data)) return [];
  return data.filter((item) => {
    if (item.type !== "file" || !item.path) return false;
    const ext = item.path.substring(item.path.lastIndexOf(".")).toLowerCase();
    return AUDIO_EXTS.includes(ext);
  }).map((item) => {
    const { title, artist } = parseBasic(item.path);
    return { path: item.path, title, artist };
  });
}

// api/_lib/aiPlaylists.ts
var MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
var MIN_TRACKS_PER_MIX = 2;
var TARGET_MIXES = [
  { name: "Punjabi Mix", emoji: "\u{1F3A7}", hint: "Punjabi-language songs", description: "Punjabi-language tracks from your library." },
  { name: "Haryanvi Mix", emoji: "\u{1F33E}", hint: "Haryanvi-language songs", description: "Haryanvi-language tracks from your library." },
  { name: "Punjabi + Haryanvi Mix", emoji: "\u{1F525}", hint: "Punjabi-language OR Haryanvi-language songs (both together)", description: "Punjabi and Haryanvi tracks together in one mix." },
  { name: "Hindi Mix", emoji: "\u{1F3AC}", hint: "Hindi-language songs", description: "Hindi-language tracks from your library." },
  { name: "Love Mix", emoji: "\u2764\uFE0F", hint: "romantic / love songs, any language", description: "Romantic songs, any language." }
];
var SINGLE_MIX_SCHEMA = {
  type: "OBJECT",
  properties: {
    indices: { type: "ARRAY", items: { type: "INTEGER" } }
  },
  required: ["indices"]
};
function buildSingleMixPrompt(songList, hint) {
  return `Numbered song library:

${songList}

Return the index of every song that is ${hint}. Use ONLY the numbers above, never invent one. Include every genuine match, not just a few. Skip anything unclear. Output indices only.`;
}
async function classifyOneMix(mix, songList, apiKey, timeoutMs = 15e3) {
  const RETRYABLE_STATUSES = /* @__PURE__ */ new Set([404, 429, 500, 502, 503, 504]);
  for (const model of MODEL_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: buildSingleMixPrompt(songList, mix.hint) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: SINGLE_MIX_SCHEMA,
              temperature: 0.2
            }
          })
        }
      );
      clearTimeout(timer);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Gemini error for "${mix.name}" on ${model}:`, res.status, errText);
        if (RETRYABLE_STATUSES.has(res.status)) continue;
        return null;
      }
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed.indices) ? parsed.indices : [];
    } catch (e) {
      clearTimeout(timer);
      console.error(`"${mix.name}" on ${model} failed:`, e?.name === "AbortError" ? "timed out" : e?.message);
      continue;
    }
  }
  return null;
}
async function generateAiPlaylists(apiKey) {
  if (!apiKey) {
    return { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), playlists: [], note: "No Gemini API key configured yet." };
  }
  const library = await fetchLibrary();
  if (library.length === 0) {
    return { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), playlists: [] };
  }
  const songList = library.map((t, i) => `${i}. ${t.artist ? `${t.artist} - ` : ""}${t.title}`).join("\n");
  const results = await Promise.all(
    TARGET_MIXES.map((mix) => classifyOneMix(mix, songList, apiKey))
  );
  const playlists = TARGET_MIXES.map((mix, i) => {
    const indices = results[i];
    const paths = (indices || []).map((idx) => library[idx]?.path).filter((p) => Boolean(p));
    return {
      id: `ai_${i}_${mix.name.replace(/\s+/g, "_").toLowerCase()}`,
      name: mix.name,
      emoji: mix.emoji,
      description: mix.description,
      paths
    };
  }).filter((p) => p.paths.length >= MIN_TRACKS_PER_MIX);
  const allFailed = results.every((r) => r === null);
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    playlists,
    ...allFailed ? { note: "AI playlist generation is taking longer than usual \u2014 try again shortly." } : {}
  };
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/hf-tree", async (req, res) => {
    const user = req.query.user || HF_USER;
    const repo = req.query.repo || HF_REPO;
    try {
      const data = await fetchFullTree(user, repo);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
      return res.json(data);
    } catch (err) {
      console.error("HF fetch error:", err);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        error: err.message || "Failed to fetch from Hugging Face",
        user,
        repo,
        tracks: []
      });
    }
  });
  let aiPlaylistsCache = null;
  app.get("/api/ai-playlists", async (req, res) => {
    const headerKey = req.headers["x-gemini-key"] || "";
    const apiKey = process.env.GEMINI_API_KEY || headerKey || "";
    if (!apiKey) {
      return res.json({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), playlists: [], note: "No Gemini API key configured yet." });
    }
    try {
      if (aiPlaylistsCache && aiPlaylistsCache.expiresAt > Date.now()) {
        return res.json(aiPlaylistsCache.result);
      }
      const result = await generateAiPlaylists(apiKey);
      aiPlaylistsCache = { result, expiresAt: Date.now() + 24 * 60 * 60 * 1e3 };
      return res.json(result);
    } catch (err) {
      console.error("AI playlists error:", err);
      return res.status(200).json({
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        playlists: [],
        note: err?.message || "Failed to generate AI playlists."
      });
    }
  });
  const AUDIO_MIME_TYPES = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac"
  };
  function mimeTypeForFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return ext && AUDIO_MIME_TYPES[ext] || null;
  }
  app.get("/api/audio", async (req, res) => {
    const user = req.query.user || "CoolJaat";
    const repo = req.query.repo || "my-music-library";
    const file = req.query.file;
    if (!file) {
      return res.status(400).send("Missing file parameter");
    }
    try {
      const url = `https://huggingface.co/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/resolve/main/${encodeURIComponent(file)}`;
      const fetchOptions = {
        method: req.method,
        headers: {},
        redirect: "follow"
      };
      if (req.headers.range) {
        fetchOptions.headers.range = req.headers.range;
      }
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        return res.status(response.status).send(`Error fetching audio: ${response.statusText}`);
      }
      const headers = new Headers(response.headers);
      headers.delete("content-encoding");
      const correctMime = mimeTypeForFile(file);
      if (correctMime) {
        headers.set("content-type", correctMime);
      }
      headers.set("content-disposition", "inline");
      if (!headers.has("accept-ranges")) {
        headers.set("accept-ranges", "bytes");
      }
      headers.set("access-control-allow-origin", "*");
      headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
      headers.set("access-control-allow-headers", "Content-Type, Range");
      headers.set("access-control-expose-headers", "Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type");
      headers.set("cross-origin-resource-policy", "cross-origin");
      res.status(response.status);
      headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      if (response.body) {
        import_stream.Readable.fromWeb(response.body).pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      console.error("Proxy audio error:", err);
      res.status(500).send("Internal Server Error");
    }
  });
  app.post("/api/admin-delete", async (req, res) => {
    try {
      const { user, repo, path: filePath, apiKey } = req.body || {};
      if (!user || !repo || !filePath) {
        return res.status(400).json({ error: "Missing user, repo, or path" });
      }
      if (!apiKey) {
        return res.status(400).json({ error: "Missing Hugging Face API key" });
      }
      const commitUrl = `https://huggingface.co/api/datasets/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/commit/main`;
      const basename = filePath.replace(/\.[^./]+$/, "");
      const ops = [
        { key: "header", value: { summary: `Delete ${filePath} via AYUSHFLIX admin panel` } },
        { key: "deletedFile", value: { path: filePath } },
        { key: "deletedFile", value: { path: `${basename}.jpg` } }
      ];
      const ndjson = ops.map((op) => JSON.stringify(op)).join("\n");
      const response = await fetch(commitUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-ndjson"
        },
        body: ndjson
      });
      const text = await response.text();
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Hugging Face rejected the delete (${response.status}): ${text.slice(0, 300)}`
        });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("Admin delete error:", err);
      return res.status(500).json({ error: err?.message || "Internal Server Error" });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", hf_config: { user: "CoolJaat", repo: "my-music-library" } });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
