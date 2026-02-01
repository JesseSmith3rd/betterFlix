"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static("public"));

// ✅ Use a Windows-safe path.
// Option A: hardcode (double slashes)
const MOVIES_DIR = process.env.MOVIES_DIR || "D:\\MOVIES\\Action"

// Option B (recommended): use path.join (uncomment and edit)
//const MOVIES_DIR = path.join("D:", "MOVIES", "Action");

const ALLOWED_EXT = new Set([".mp4", ".m4v", ".mov", ".webm"]);

function safeJoin(base, target) {
  const cleaned = path.normalize(target).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(base, cleaned);
}

app.get("/", (req, res) => {
  res.send("✅ BetterFlix is running. Try /api/movies");
});

app.get("/api/movies", (req, res) => {
  try {
    const entries = fs.readdirSync(MOVIES_DIR, { withFileTypes: true });

    const files = entries
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => ALLOWED_EXT.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    res.json({
      moviesDir: MOVIES_DIR,
      count: files.length,
      items: files.map((name) => ({
        id: name,
        title: path.parse(name).name,
        file: name,
      })),
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      moviesDir: MOVIES_DIR,
      hint:
        "Check MOVIES_DIR exists and uses double-backslashes on Windows, e.g. E:\\MOVIES\Action",
    });
  }
});

app.get("/api/stream/:file", (req, res) => {
  const file = req.params.file;
  const filePath = safeJoin(MOVIES_DIR, file);

  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");

  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return res.status(400).send("Unsupported format");

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const mime =
    ext === ".mp4" ? "video/mp4" :
    ext === ".m4v" ? "video/x-m4v" :
    ext === ".mov" ? "video/quicktime" :
    ext === ".webm" ? "video/webm" :
    "application/octet-stream";

  if (!range) {
    res.writeHead(200, { "Content-Length": fileSize, "Content-Type": mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (Number.isNaN(start) || start >= fileSize) {
    return res.status(416).send("Requested Range Not Satisfiable");
  }

  const chunkSize = end - start + 1;
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": mime,
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
});

app.get("/api/debug/drives", (req, res) => {
  const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const results = [];

  for (const L of letters) {
    const root = `${L}:\\`;
    try {
      const items = fs.readdirSync(root);
      results.push({ drive: root, ok: true, sample: items.slice(0, 10) });
    } catch (e) {
      results.push({ drive: root, ok: false, error: e.code || e.message });
    }
  }

  res.json(results);
});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`✅ BetterFlix server running at http://localhost:${PORT}`);
  console.log(`📂 MOVIES_DIR: ${MOVIES_DIR}`);
});
     