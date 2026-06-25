/* =============================================================
   Local editor server (no dependencies).

   Run:   node editor-server.js
   Then open the URL it prints (http://localhost:8080/editor.html).

   - Serves the files in this folder.
   - POST /save writes content.js to disk (used by the Save button).
   The editor also works when opened directly via file://, but then
   Save downloads content.js instead of writing it in place.
   ============================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Save endpoint
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 5e6) req.destroy(); // 5 MB guard
    });
    req.on("end", () => {
      fs.writeFile(path.join(ROOT, "content.js"), body, "utf8", (err) => {
        if (err) {
          res.writeHead(500);
          res.end("write failed: " + err.message);
        } else {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("ok");
          console.log("Saved content.js (" + body.length + " bytes)");
        }
      });
    });
    return;
  }

  // Static files
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/editor.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found: " + rel);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  CV editor running:");
  console.log("    http://localhost:" + PORT + "/editor.html");
  console.log("");
  console.log("  Edit, watch the live preview, click Save to write content.js.");
  console.log("  Stop with Ctrl+C.");
});
