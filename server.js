const express = require("express");
const path = require("path");
const { handler: askCrystalHandler } = require("./netlify/functions/ask-crystal");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

app.use(express.json({ limit: "1mb" }));

async function handleBuddyRequest(req, res) {
  try {
    const result = await askCrystalHandler({
      httpMethod: req.method,
      headers: req.headers,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
    });

    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
    }

    res.status(result.statusCode || 200).send(result.body || "");
  } catch (err) {
    res.status(500).json({ error: "Failed to reach Wave Buddy: " + err.message });
  }
}

app.all("/.netlify/functions/ask-crystal", handleBuddyRequest);
app.all("/api/buddy", handleBuddyRequest);

const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/manifest.webmanifest", "manifest.webmanifest"],
  ["/sw.js", "sw.js"],
  ["/icon.png", "icon.png"],
]);

app.get("*", (req, res) => {
  const mappedFile = PUBLIC_FILES.get(req.path);
  if (mappedFile) {
    if (mappedFile === "index.html" || mappedFile === "sw.js") {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    }
    return res.sendFile(path.join(__dirname, mappedFile));
  }
  return res.status(404).send("Not found");
});

app.listen(PORT, HOST, () => {
  console.log(`Wavelord Library running on http://${HOST}:${PORT}`);
});
