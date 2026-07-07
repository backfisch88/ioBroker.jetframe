"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var visConfig_exports = {};
__export(visConfig_exports, {
  writeVisConfig: () => writeVisConfig
});
module.exports = __toCommonJS(visConfig_exports);
async function writeVisConfig(adapter, config, logDebug, logWarn) {
  try {
    const visualSource = String(config.visualSource || "current").toLowerCase();
    const safeSource = ["current", "airport", "overflight"].includes(visualSource) ? visualSource : "current";
    const data = {
      simpleApiHost: String(config.simpleApiHost || "").trim(),
      simpleApiPort: Number(config.simpleApiPort || 8087),
      visualSource: safeSource,
      instance: adapter.instance,
      dpRoot: config.dpRoot || `jetframe.${adapter.instance}`,
      updated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await adapter.writeFileAsync(
      "jetframe.admin",
      "vis-config.json",
      Buffer.from(JSON.stringify(data, null, 2), "utf8")
    );
    logDebug(
      `VIS config written: source=${data.visualSource}, apiHost=${data.simpleApiHost || "auto"}, apiPort=${data.simpleApiPort}`
    );
  } catch (e) {
    logWarn(`VIS config could not be written: ${e instanceof Error ? e.message : String(e)}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  writeVisConfig
});
//# sourceMappingURL=visConfig.js.map
