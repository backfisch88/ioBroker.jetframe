"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var webServer_exports = {};
__export(webServer_exports, {
  startWebServer: () => startWebServer
});
module.exports = __toCommonJS(webServer_exports);
var fs = __toESM(require("node:fs"));
var http = __toESM(require("node:http"));
var path = __toESM(require("node:path"));
const STATIC_FILES = {
  "/": { file: "index.html", contentType: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", contentType: "text/html; charset=utf-8" },
  "/frame.html": { file: "frame.html", contentType: "text/html; charset=utf-8" },
  "/heatmap.html": { file: "heatmap.html", contentType: "text/html; charset=utf-8" },
  "/stats.html": { file: "stats.html", contentType: "text/html; charset=utf-8" },
  "/jetframe.css": { file: "jetframe.css", contentType: "text/css; charset=utf-8" },
  "/jetframe.png": { file: "jetframe.png", contentType: "image/png" },
  "/SF-Pro.ttf": { file: "SF-Pro.ttf", contentType: "font/ttf" },
  "/manifest.webmanifest": { file: "manifest.webmanifest", contentType: "application/manifest+json" }
};
const WRITABLE_STATE_SUFFIXES = [".enabled", ".speechEnabled", ".clearImageCache"];
function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
}
function startWebServer(adapter, config) {
  const staticDir = path.resolve(__dirname, "../../admin");
  const server = http.createServer((req, res) => {
    void handleRequest(adapter, config, staticDir, req, res).catch((e) => {
      adapter.log.warn(`[JetFrame] Web server request error: ${e instanceof Error ? e.message : String(e)}`);
      try {
        sendText(res, 500, "Internal error");
      } catch {
      }
    });
  });
  server.on("error", (e) => {
    adapter.log.error(
      `[JetFrame] Web server could not be started on port ${config.webPort}: ${e instanceof Error ? e.message : String(e)}`
    );
  });
  server.listen(config.webPort, () => {
    adapter.log.info(`[JetFrame] Web server listening on port ${config.webPort}`);
  });
  return server;
}
async function handleRequest(adapter, config, staticDir, req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/config") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ dpRoot: config.dpRoot, visualSource: config.visualSource }));
    return;
  }
  if (pathname.startsWith("/state/")) {
    await handleStateRequest(adapter, config, pathname.slice("/state/".length), url, req, res);
    return;
  }
  const staticEntry = STATIC_FILES[pathname];
  if (staticEntry) {
    serveStaticFile(adapter, staticDir, staticEntry, res);
    return;
  }
  sendText(res, 404, "Not found");
}
function serveStaticFile(adapter, staticDir, entry, res) {
  const filePath = path.join(staticDir, entry.file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      adapter.log.warn(`[JetFrame] Web server could not read static file ${entry.file}: ${err.message}`);
      sendText(res, 404, "Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": entry.contentType, "Cache-Control": "no-store" });
    res.end(data);
  });
}
async function handleStateRequest(adapter, config, rawId, url, req, res) {
  var _a;
  const id = rawId.replace(/\/+$/, "");
  if (!id.startsWith(`${config.dpRoot}.`) && id !== config.dpRoot) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (req.method === "GET") {
    const state = await adapter.getForeignStateAsync(id);
    sendText(res, 200, state && state.val !== null && state.val !== void 0 ? String(state.val) : "");
    return;
  }
  if (req.method === "POST") {
    const isWritable = WRITABLE_STATE_SUFFIXES.some((suffix) => id.endsWith(suffix));
    if (!isWritable) {
      sendText(res, 403, "Forbidden");
      return;
    }
    const rawValue = (_a = url.searchParams.get("value")) != null ? _a : await readRequestBodyValue(req);
    const value = coerceStateValue(rawValue);
    await adapter.setForeignStateAsync(id, value, false);
    sendText(res, 200, "OK");
    return;
  }
  sendText(res, 405, "Method not allowed");
}
function coerceStateValue(raw) {
  if (raw === null) {
    return "";
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (raw !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}
function readRequestBodyValue(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const params = new URLSearchParams(body);
      resolve(params.get("value"));
    });
    req.on("error", () => resolve(null));
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startWebServer
});
//# sourceMappingURL=webServer.js.map
