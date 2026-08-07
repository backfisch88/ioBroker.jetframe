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
var staticFiles_exports = {};
__export(staticFiles_exports, {
  copyStaticFiles: () => copyStaticFiles
});
module.exports = __toCommonJS(staticFiles_exports);
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));
const RUNTIME_MANAGED_TOP_LEVEL_DIRS = ["img"];
async function copyStaticFiles(adapter) {
  const sourceDir = path.resolve(__dirname, "../../admin");
  adapter.log.debug(`[JetFrame] Static source: ${sourceDir}`);
  if (!fs.existsSync(sourceDir)) {
    adapter.log.warn(`[JetFrame] Static source directory missing: ${sourceDir}`);
    return;
  }
  const writtenPaths = /* @__PURE__ */ new Set();
  await copyRecursiveToIoBrokerFiles(adapter, sourceDir, "", writtenPaths);
  adapter.log.debug("[JetFrame] Static files copied to ioBroker files");
  await removeOrphanedFiles(adapter, writtenPaths);
}
async function copyRecursiveToIoBrokerFiles(adapter, srcDir, relDir, writtenPaths) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "src") {
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      continue;
    }
    if (entry.name === "tsconfig.json") {
      continue;
    }
    const srcPath = path.join(srcDir, entry.name);
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await copyRecursiveToIoBrokerFiles(adapter, srcPath, relPath, writtenPaths);
      continue;
    }
    const buffer = fs.readFileSync(srcPath);
    await adapter.writeFileAsync("jetframe.admin", relPath, buffer);
    writtenPaths.add(relPath);
    adapter.log.debug(`[JetFrame] Static written: jetframe.admin/${relPath}`);
  }
}
async function removeOrphanedFiles(adapter, writtenPaths) {
  await removeOrphanedFilesInDir(adapter, "", writtenPaths);
}
async function removeOrphanedFilesInDir(adapter, dir, writtenPaths) {
  let entries;
  try {
    entries = await adapter.readDirAsync("jetframe.admin", dir);
  } catch {
    return;
  }
  for (const entry of entries || []) {
    if (!(entry == null ? void 0 : entry.file)) {
      continue;
    }
    if (!dir && RUNTIME_MANAGED_TOP_LEVEL_DIRS.includes(entry.file)) {
      continue;
    }
    const relPath = dir ? `${dir}/${entry.file}` : entry.file;
    if (entry.isDir) {
      await removeOrphanedFilesInDir(adapter, relPath, writtenPaths);
      continue;
    }
    if (!writtenPaths.has(relPath)) {
      try {
        await adapter.unlinkAsync("jetframe.admin", relPath);
        adapter.log.debug(`[JetFrame] Removed orphaned static file: jetframe.admin/${relPath}`);
      } catch (e) {
        adapter.log.warn(
          `[JetFrame] Could not remove orphaned file ${relPath}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  copyStaticFiles
});
//# sourceMappingURL=staticFiles.js.map
