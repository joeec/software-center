"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => address.address);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function resolveRequestedFile(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = path.resolve(ROOT, relativePath);

  // Bloquea cualquier intento de salir del directorio del proyecto.
  return absolutePath.startsWith(`${ROOT}${path.sep}`) ? absolutePath : null;
}

const server = http.createServer((request, response) => {
  if (request.url === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      application: "Software Center",
      host: HOST,
      port: PORT,
    });
    return;
  }

  const filePath = resolveRequestedFile(request.url);
  if (!filePath) {
    sendJson(response, 403, { error: "Ruta no permitida" });
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(response, 404, { error: "Recurso no encontrado" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": extension === ".json" ? "no-cache" : "public, max-age=3600",
    };

    response.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Software Center disponible en http://localhost:${PORT}`);
  getLanAddresses().forEach((address) => {
    console.log(`Acceso desde la red: http://${address}:${PORT}`);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`El puerto ${PORT} ya está en uso.`);
  } else {
    console.error("No se pudo iniciar Software Center:", error.message);
  }
  process.exit(1);
});

