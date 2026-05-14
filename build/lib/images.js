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
var images_exports = {};
__export(images_exports, {
  ensureImageDirs: () => ensureImageDirs,
  saveImages: () => saveImages
});
module.exports = __toCommonJS(images_exports);
var https = __toESM(require("https"));
var http = __toESM(require("http"));
const IMAGE_CACHE = {
  jetDir: "img/jet",
  logoDir: "img/logos"
};
async function ensureImageDirs(adapter, logDebug, logWarn) {
  try {
    await adapter.writeFileAsync("jetframe.admin", ".keep", Buffer.from(""));
    logDebug("jetframe.admin Datei-Storage bereit");
  } catch (e) {
    logWarn(`jetframe.admin Storage Fehler: ${errorText(e)}`);
  }
}
async function saveImages(adapter, config, a, logDebug, logWarn) {
  const logoUrl = await cacheLogoIfNeeded(adapter, a, logDebug, logWarn);
  const jetUrl = await cacheJetIfNeeded(adapter, a, logDebug, logWarn);
  a.localLogoUrl = logoUrl;
  a.localImageUrl = jetUrl;
  a.finalImageUrl = jetUrl || logoUrl || "";
  const bases = [`${config.dpRoot}.current`];
  if (a.mode === "OVERFLIGHT") {
    bases.push(`${config.dpRoot}.overflight`);
  } else {
    bases.push(`${config.dpRoot}.airport`);
  }
  for (const base of bases) {
    await adapter.setForeignStateAsync(`${base}.localLogoUrl`, logoUrl, true);
    await adapter.setForeignStateAsync(`${base}.localImageUrl`, jetUrl, true);
    await adapter.setForeignStateAsync(`${base}.finalImageUrl`, jetUrl || logoUrl || "", true);
  }
}
async function cacheLogoIfNeeded(adapter, a, logDebug, logWarn) {
  if (!a.logoUrl) {
    return "";
  }
  const logoKey = String(a.airlineIcao || a.airlineIata || a.callsign || "logo").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8);
  const fileBase = safeFileName(logoKey);
  const existing = await findExistingImage(adapter, IMAGE_CACHE.logoDir, fileBase);
  if (existing) {
    logDebug(`Logo Cache hit: ${existing.url}`);
    return existing.url;
  }
  try {
    logDebug(`Logo Download: ${a.logoUrl}`);
    const buffer = await downloadImageBuffer(a.logoUrl, false);
    const ext = detectImageExt(buffer);
    const relPath = `${IMAGE_CACHE.logoDir}/${fileBase}.${ext}`;
    await adapter.writeFileAsync("jetframe.admin", relPath, buffer);
    const url = publicUrl(relPath);
    logDebug(`Logo gespeichert: ${url}`);
    return url;
  } catch (e) {
    logWarn(`Logo Download/Speichern Fehler: ${errorText(e)}`);
    return "";
  }
}
function buildHexDbImageUrl(a) {
  const hex = String(a.hex || "").trim().toLowerCase().replace(/[^a-f0-9]/g, "");
  if (hex) {
    return `https://hexdb.io/hex-image?hex=${hex}`;
  }
  const reg = String(a.registration || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (reg) {
    return `https://hexdb.io/static/aircraft-images/${reg}.jpg`;
  }
  return "";
}
async function cacheJetIfNeeded(adapter, a, logDebug, logWarn) {
  const key = a.registration || a.callsign || a.hex || "unknown";
  const fileBase = safeFileName(key);
  const existing = await findExistingImage(adapter, IMAGE_CACHE.jetDir, fileBase);
  if (existing) {
    logDebug(`Jet Cache hit: ${existing.url}`);
    return existing.url;
  }
  const hexUrl = buildHexDbImageUrl(a);
  if (hexUrl) {
    try {
      logDebug(`Jet Bild Download (HexDB): ${hexUrl}`);
      const buffer = await downloadImageBuffer(hexUrl, false);
      const ext = detectImageExt(buffer);
      const relPath = `${IMAGE_CACHE.jetDir}/${fileBase}.${ext}`;
      await adapter.writeFileAsync("jetframe.admin", relPath, buffer);
      const url = publicUrl(relPath);
      logDebug(`Jet gespeichert (HexDB): ${url}`);
      return url;
    } catch (e) {
      logDebug(`Jet Bild HexDB nicht nutzbar: ${errorText(e)}`);
    }
  }
  let fr24Url = String(a.fr24ImageUrl || a.jetphotosImageUrl || "").trim();
  if (!fr24Url) {
    fr24Url = await resolveFr24AircraftImageFromPage(a, logDebug, logWarn);
  }
  if (!fr24Url) {
    return "";
  }
  try {
    logDebug(`Jet Bild Download (FR24 Fallback): ${fr24Url}`);
    const buffer = await downloadImageBuffer(fr24Url, true);
    const ext = detectImageExt(buffer);
    const relPath = `${IMAGE_CACHE.jetDir}/${fileBase}.${ext}`;
    await adapter.writeFileAsync("jetframe.admin", relPath, buffer);
    const url = publicUrl(relPath);
    logDebug(`Jet gespeichert (FR24 Fallback): ${url}`);
    return url;
  } catch (e) {
    logWarn(`FR24 Bild Download/Speichern Fehler: ${errorText(e)}`);
    return "";
  }
}
async function findExistingImage(adapter, relDir, fileBase) {
  const exts = ["jpg", "jpeg", "png", "webp", "avif"];
  for (const ext of exts) {
    const relPath = `${relDir}/${fileBase}.${ext}`;
    try {
      const file = await adapter.readFileAsync("jetframe.admin", relPath);
      if (file == null ? void 0 : file.file) {
        return {
          url: publicUrl(relPath)
        };
      }
    } catch {
    }
  }
  return null;
}
async function resolveFr24AircraftImageFromPage(a, logDebug, logWarn) {
  const reg = String(a.registration || "").trim().toLowerCase();
  if (!reg) {
    return "";
  }
  const url = `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(reg)}`;
  try {
    logDebug(`FR24 Aircraft Page Anfrage: ${url}`);
    const html = await new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1"
          },
          timeout: 2e4
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          res.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"));
          });
        }
      );
      req.on("timeout", () => {
        req.destroy(new Error("FR24 Timeout"));
      });
      req.on("error", reject);
    });
    const matches = [...html.matchAll(/https:\/\/cdn\.jetphotos\.com\/[^"' ]+\.(jpg|jpeg|png|webp)/gi)];
    if (!matches.length) {
      logDebug(`FR24 Aircraft kein Bild gefunden: ${reg}`);
      return "";
    }
    const imageUrl = String(matches[0][0] || "").trim();
    logDebug(`FR24 Aircraft Bild gefunden: ${imageUrl}`);
    return imageUrl;
  } catch (e) {
    logWarn(`FR24 Aircraft Fehler: ${errorText(e)}`);
    return "";
  }
}
function looksLikeImageBuffer(buf) {
  if (buf.length >= 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
    return true;
  }
  if (buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
    return true;
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return true;
  }
  if (buf.includes(Buffer.from("ftypavif"))) {
    return true;
  }
  return false;
}
function detectImageExt(buf) {
  if (buf.length >= 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
    return "jpg";
  }
  if (buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
    return "png";
  }
  if (buf.length >= 12 && buf.subarray(0).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  if (buf.includes(Buffer.from("ftypavif"))) {
    return "avif";
  }
  return "jpg";
}
function publicUrl(relPath) {
  return `/jetframe.admin/${relPath}`;
}
function safeFileName(name) {
  return String(name || "unknown").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}
function downloadImageBuffer(url, useReferer, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("Zu viele Redirects beim Bilddownload"));
      return;
    }
    const client = url.startsWith("https") ? https : http;
    const headers = {
      "User-Agent": "Mozilla/5.0 AppleWebKit/605.1.15 Safari/604.1",
      Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8"
    };
    if (useReferer) {
      headers.Referer = "https://www.flightradar24.com/";
    }
    const req = client.get(
      url,
      {
        headers,
        timeout: 2e4
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).toString();
          downloadImageBuffer(nextUrl, useReferer, redirects + 1).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (!buffer.length) {
            reject(new Error("Leeres Bild erhalten"));
            return;
          }
          const contentType = String(res.headers["content-type"] || "").toLowerCase();
          const text = buffer.toString("utf8").trim();
          if (!contentType.startsWith("image/") && /^https?:\/\//i.test(text)) {
            downloadImageBuffer(text, useReferer, redirects + 1).then(resolve).catch(reject);
            return;
          }
          if (!looksLikeImageBuffer(buffer)) {
            reject(new Error("Antwort ist kein Bild"));
            return;
          }
          resolve(buffer);
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Bild Download Timeout"));
    });
    req.on("error", reject);
  });
}
function errorText(e) {
  if (!e) {
    return "unbekannter Fehler";
  }
  if (typeof e === "string") {
    return e;
  }
  if (e instanceof Error) {
    return e.message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureImageDirs,
  saveImages
});
//# sourceMappingURL=images.js.map
