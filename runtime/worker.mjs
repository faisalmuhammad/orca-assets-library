import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/worker/workspace-resolver.ts
var workspace_resolver_exports = {};
__export(workspace_resolver_exports, {
  chooseActive: () => chooseActive,
  isLocal: () => isLocal,
  resolveWorkspace: () => resolveWorkspace,
  safePath: () => safePath,
  stableId: () => stableId,
  within: () => within
});
import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
function within(root, file) {
  const rel = path.relative(root, file);
  return rel === "" || !rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel);
}
async function safePath(root, file) {
  if (!file || file.includes("\0")) throw new Error("Invalid file path");
  const canonicalRoot = await realpath(root);
  if (path.basename(path.dirname(root)) === "chat-scratch" && /^[a-f0-9]{32}$/.test(path.basename(root)) && canonicalRoot !== path.resolve(root)) throw new Error("Chat directory changed or became a symlink");
  if (!path.isAbsolute(file) && !within(canonicalRoot, path.resolve(canonicalRoot, file))) throw new Error("File is outside this worktree");
  const absolute = path.resolve(root, file);
  const canonical = await realpath(absolute);
  if (!within(canonicalRoot, canonical)) throw new Error("Symlink leaves this worktree");
  return canonical;
}
async function resolveWorkspace(w) {
  if (!isLocal(w)) return { ...w, root: void 0, libraryProjectId: void 0, reason: "Remote assets need a remote filesystem API that this Orca does not expose." };
  try {
    const root = await realpath(w.path);
    if (!(await stat(root)).isDirectory()) throw new Error("Workspace folder is unavailable");
    let identity = root;
    try {
      const { stdout } = await execute("git", ["-C", root, "rev-parse", "--path-format=absolute", "--git-common-dir"], { timeout: 3e3, maxBuffer: 16384 });
      identity = await realpath(stdout.trim());
    } catch {
    }
    return { ...w, root, libraryProjectId: w.projectId ? "host:" + (w.hostId ?? "local") + ":" + w.projectId : stableId("local:" + identity) };
  } catch {
    return { ...w, reason: "Workspace folder is unavailable on this host." };
  }
}
function chooseActive(context, workspaces, terminals) {
  if (!context) return null;
  if (context.workspaceId) return workspaces.find((w) => w.id === context.workspaceId) ?? null;
  const mapped = [...new Set(context.terminals.map((t) => terminals.get(t.id)).filter((v) => !!v))];
  if (mapped.length === 1) return workspaces.find((w) => w.id === mapped[0]) ?? null;
  const matches = workspaces.filter((w) => w.name === context.displayName && (w.branch ?? "") === context.branch);
  return matches.length === 1 ? matches[0] : null;
}
var execute, stableId, isLocal;
var init_workspace_resolver = __esm({
  "src/worker/workspace-resolver.ts"() {
    "use strict";
    execute = promisify(execFile);
    stableId = (value) => createHash("sha256").update(value).digest("hex").slice(0, 32);
    isLocal = (w) => !w.hostId || w.hostId === "local";
  }
});

// src/worker/index.ts
import path12 from "node:path";
import { stat as stat5 } from "node:fs/promises";
import { createHash as createHash6 } from "node:crypto";

// src/shared/constants.ts
var EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif", "md", "markdown", "mp4", "webm", "html", "htm"];
var DEFAULT_SETTINGS = { includedFolders: [], excludedFolders: [], maxSizeMB: 32, extensions: EXTENSIONS, includeIgnored: false, includeUnavailable: false };
var EXCLUDED = /* @__PURE__ */ new Set(["node_modules", ".git", ".cache", ".next", ".nuxt", ".turbo", ".parcel-cache", ".venv", "venv", "vendor", "coverage", "__pycache__", ".DS_Store"]);
var MAX_ASSETS = 2e4;
var CHUNK_SIZE = 128 * 1024;

// src/shared/asset-identity.ts
function assetPathKey(value) {
  const windows = /^[a-z]:[\\/]|^\\\\/i.test(value), input = windows ? value.replace(/\\/g, "/") : value;
  const prefix = input.startsWith("//") ? "//" : input.startsWith("/") ? "/" : "", parts = [];
  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === ".." && parts.length && parts.at(-1) !== "..") parts.pop();
    else if (part !== ".." || !prefix) parts.push(part);
  }
  if (windows && /^[a-z]:$/i.test(parts[0] ?? "")) parts[0] = parts[0].toUpperCase();
  return prefix + parts.join("/");
}
var isGeneratedAsset = (a) => a.location === "chat" ? ["confirmed-agent", "chat-output"].includes(a.origin) && typeof a.sourceRoot === "string" && typeof a.conversationId === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(a.conversationId) : a.origin === "confirmed-agent";
var confidence = { discovered: 0, "inferred-agent": 1, "chat-output": 2, "confirmed-agent": 3 };
function mergeAssetRecords(a, b) {
  const newest = a.updatedAt > b.updatedAt ? a : a.updatedAt < b.updatedAt ? b : a.id.localeCompare(b.id) <= 0 ? a : b;
  const provenance = confidence[a.origin] > confidence[b.origin] ? a : confidence[a.origin] < confidence[b.origin] ? b : newest;
  const survivor = a.createdAt < b.createdAt ? a : a.createdAt > b.createdAt ? b : a.id.localeCompare(b.id) <= 0 ? a : b;
  return { ...newest, id: survivor.id, createdAt: Math.min(a.createdAt, b.createdAt), version: Math.max(a.version, b.version), origin: provenance.origin, agent: provenance.agent ?? newest.agent, tool: provenance.tool ?? newest.tool };
}
function uniqueAssets(records) {
  const paths = /* @__PURE__ */ new Map();
  for (const a of records) {
    const key = assetPathKey(a.absolutePath), old = paths.get(key);
    paths.set(key, old ? mergeAssetRecords(old, a) : a);
  }
  return [...paths.values()];
}

// src/shared/query.ts
function selectAssets(records, active, q) {
  if (!active?.libraryProjectId || !active.root) return [];
  const root = assetPathKey(active.root).replace(/\/$/, "") + "/";
  const search = (q.search ?? "").trim().toLocaleLowerCase();
  return uniqueAssets([...records].filter((a) => {
    const sourceRoot = a.location === "chat" && !a.originalPath && a.sourceRoot ? assetPathKey(a.sourceRoot).replace(/[/]$/, "") + "/" : root;
    if (a.projectId !== active.libraryProjectId || a.worktreeId !== active.id || !assetPathKey(a.absolutePath).startsWith(sourceRoot)) return false;
    if (q.worktreeId && a.worktreeId !== q.worktreeId) return false;
    if (!isGeneratedAsset(a) || q.includeInferred === false && a.origin === "inferred-agent") return false;
    return true;
  })).filter((a) => {
    if (a.status === "missing" && q.includeUnavailable !== true) return false;
    if (search && !(a.filename + " " + a.relativePath).toLocaleLowerCase().includes(search)) return false;
    switch (q.filter) {
      case "images":
        return a.mimeType.startsWith("image/");
      case "videos":
        return a.mimeType.startsWith("video/");
      case "markdown":
        return a.mimeType === "text/markdown";
      case "other":
        return !a.mimeType.startsWith("image/") && !a.mimeType.startsWith("video/") && a.mimeType !== "text/markdown";
      default:
        return true;
    }
  }).sort((a, b) => (q.sort === "filename" ? a.filename.localeCompare(b.filename) : q.sort === "size" ? b.sizeBytes - a.sizeBytes : q.sort === "oldest" ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt) || a.id.localeCompare(b.id));
}

// src/worker/index.ts
init_workspace_resolver();

// src/worker/agent-observer.ts
var object = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
function failed(output) {
  const o = object(output);
  if (!o) return false;
  return o.isError === true || o.success === false || o.ok === false || !!o.error || typeof o.exit_code === "number" && o.exit_code !== 0 || typeof o.exitCode === "number" && o.exitCode !== 0;
}
function evidence(event) {
  if (failed(event.output)) return null;
  const name = event.tool.split(/[.:/]/).at(-1).toLowerCase(), input = object(event.input);
  if (["write", "write_file", "create_file", "edit", "edit_file", "multiedit"].includes(name) && input) {
    const p = input.file_path ?? input.path;
    if (typeof p === "string") return { paths: [p], kind: "write-input" };
  }
  if (name === "apply_patch") {
    const patch = typeof event.input === "string" ? event.input : input?.patch ?? input?.input;
    if (typeof patch === "string") return { paths: [...patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map((m) => m[1]), kind: "write-input" };
  }
  const output = object(event.output);
  if (!output || /^(read|read_file|view_image|list|glob|grep|search|stat)$/.test(name)) return null;
  const paths = [];
  for (const key of ["output_files", "generated_files", "written_files"]) {
    const values = output[key];
    if (Array.isArray(values)) for (const v of values.slice(0, 128)) {
      const p = typeof v === "string" ? v : object(v)?.path;
      if (typeof p === "string") paths.push(p);
    }
  }
  return paths.length ? { paths, kind: "output" } : null;
}
var AgentObserver = class {
  panes = /* @__PURE__ */ new Map();
  set(workspaceId, pane, state, at) {
    if (state === "working") this.panes.set(pane, { workspaceId, at });
    else this.panes.delete(pane);
  }
  active(workspaceId) {
    return [...this.panes.values()].some((p) => p.workspaceId === workspaceId);
  }
  remove(workspaceId) {
    for (const [k, p] of this.panes) if (p.workspaceId === workspaceId) this.panes.delete(k);
  }
};

// src/worker/asset-index.ts
init_workspace_resolver();
import path3 from "node:path";

// src/worker/metadata-extractor.ts
import path2 from "node:path";

// src/worker/video-metadata.ts
var invalid = () => new Error("Invalid or unsupported video container");
var LIMIT = 4096;
function mp4(bytes) {
  let count = 0;
  function boxes(start, end) {
    const result = [];
    while (start < end) {
      if (++count > LIMIT || end - start < 8) throw invalid();
      let size = bytes.readUInt32BE(start), header = 8;
      if (size === 1) {
        if (end - start < 16) throw invalid();
        const wide = bytes.readBigUInt64BE(start + 8);
        if (wide > BigInt(end - start)) throw invalid();
        size = Number(wide);
        header = 16;
      } else if (size === 0) size = end - start;
      if (size < header || size > end - start) throw invalid();
      result.push({ type: bytes.toString("latin1", start + 4, start + 8), start: start + header, end: start + size });
      start += size;
    }
    return result;
  }
  const top = boxes(0, bytes.length), ftyp = top.find((b) => b.type === "ftyp");
  if (!ftyp || ftyp.end - ftyp.start < 8 || (ftyp.end - ftyp.start) % 4 !== 0 || ftyp.end - ftyp.start > LIMIT * 4) throw invalid();
  const brands = [bytes.toString("latin1", ftyp.start, ftyp.start + 4)];
  for (let p = ftyp.start + 8; p < ftyp.end; p += 4) brands.push(bytes.toString("latin1", p, p + 4));
  if (!brands.some((b) => ["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso8", "iso9", "mp41", "mp42", "avc1", "M4V ", "dash", "MSNV"].includes(b))) throw invalid();
  let video = false;
  for (const moov of top.filter((b) => b.type === "moov")) for (const trak of boxes(moov.start, moov.end).filter((b) => b.type === "trak")) for (const mdia of boxes(trak.start, trak.end).filter((b) => b.type === "mdia")) for (const handler of boxes(mdia.start, mdia.end).filter((b) => b.type === "hdlr")) {
    if (handler.end - handler.start < 12) throw invalid();
    if (bytes.toString("latin1", handler.start + 8, handler.start + 12) === "vide") video = true;
  }
  return video;
}
function webm(bytes) {
  let count = 0;
  function elements2(start, end) {
    const result = [];
    while (start < end) {
      if (++count > LIMIT) throw invalid();
      const first = bytes[start];
      let idWidth = 1, marker = 128;
      while (idWidth <= 4 && !(first & marker)) {
        idWidth++;
        marker >>= 1;
      }
      if (idWidth > 4 || start + idWidth >= end) throw invalid();
      let type = 0;
      for (let p = 0; p < idWidth; p++) type = type * 256 + bytes[start + p];
      start += idWidth;
      const sizeFirst = bytes[start];
      let sizeWidth = 1;
      marker = 128;
      while (sizeWidth <= 8 && !(sizeFirst & marker)) {
        sizeWidth++;
        marker >>= 1;
      }
      if (sizeWidth > 8 || start + sizeWidth > end) throw invalid();
      let size = BigInt(sizeFirst & marker - 1);
      for (let p = 1; p < sizeWidth; p++) size = size * 256n + BigInt(bytes[start + p]);
      const unknown = size === (1n << BigInt(7 * sizeWidth)) - 1n;
      start += sizeWidth;
      if (unknown && type !== 408125543 && type !== 524531317) throw invalid();
      if (!unknown && size > BigInt(end - start)) throw invalid();
      const finish = unknown ? end : start + Number(size);
      result.push({ type, start, end: finish });
      start = finish;
    }
    return result;
  }
  const top = elements2(0, bytes.length), header = top[0];
  if (!header || header.type !== 440786851) throw invalid();
  const docType = elements2(header.start, header.end).find((e) => e.type === 17026);
  if (!docType || bytes.toString("latin1", docType.start, docType.end) !== "webm") throw invalid();
  let video = false;
  for (const segment of top.filter((e) => e.type === 408125543)) for (const tracks of elements2(segment.start, segment.end).filter((e) => e.type === 374648427)) for (const entry of elements2(tracks.start, tracks.end).filter((e) => e.type === 174)) {
    const fields = elements2(entry.start, entry.end), kind = fields.find((e) => e.type === 131), codec = fields.find((e) => e.type === 134);
    if (kind && kind.end - kind.start === 1 && bytes[kind.start] === 1 && codec && ["V_VP8", "V_VP9", "V_AV1"].includes(bytes.toString("latin1", codec.start, codec.end))) video = true;
  }
  return video;
}
function videoMetadata(bytes, extension) {
  const video = extension === ".mp4" ? mp4(bytes) : extension === ".webm" ? webm(bytes) : false;
  if (!video) throw invalid();
  return { mimeType: extension === ".mp4" ? "video/mp4" : "video/webm" };
}

// src/worker/markdown.ts
var escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function validateTextDocument(bytes, label) {
  if (bytes.length > 2 * 1024 * 1024) throw new Error(label + " preview limit is 2 MB");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error(label + " file contains binary data");
  return text;
}
var validateMarkdown = (bytes) => validateTextDocument(bytes, "Markdown");
function markdownThumbnail(text, label = "MARKDOWN") {
  const lines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 16);
  let y = 92;
  const content = lines.map((line, index) => {
    const heading = /^#{1,2}\s/.test(line), title = index === 0 && heading;
    const plain = line.replace(/^#{1,6}\s*/, "").replace(/!\[([^\]]*)\]\([^)]*\)/g, "[Image: $1]").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__|\x60/g, "").slice(0, title ? 30 : heading ? 42 : 54);
    const result = '<text x="36" y="' + y + '" font-family="sans-serif" font-size="' + (title ? 26 : heading ? 18 : 13) + '" fill="' + (heading ? "#203e36" : "#6f6b80") + '">' + escape(plain) + "</text>";
    y += title ? 46 : heading ? 34 : 25;
    return result;
  }).join("");
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560"><rect width="480" height="560" rx="12" fill="#fafaf8"/><text x="36" y="42" font-family="sans-serif" font-size="11" fill="#6f6b80">' + escape(label) + '</text><path d="M36 58H444" stroke="#dedfe3"/>' + content + "</svg>");
}

// src/worker/html.ts
function validateHtml(bytes) {
  const text = validateTextDocument(bytes, "HTML");
  const lead = text.slice(0, 8192).replace(/^\uFEFF/, "").replace(/<!--[^]*?-->/g, "").trimStart();
  if (!/^(?:<!doctype\s+html(?:\s|>)|<(?:html|head|body|title|meta|link|style|script|main|section|article|header|footer|nav|div|span|p|h[1-6]|a|img|ul|ol|li|table|form|button|input|svg|canvas|figure|details|template)(?:\s|\/?>))/i.test(lead)) throw new Error("Unsupported HTML document signature");
  return text;
}
var htmlThumbnail = (text) => markdownThumbnail(text, "HTML");

// node_modules/image-size/dist/esm/types/utils.js
var decoder = new TextDecoder();
var toUTF8String = (input, start = 0, end = input.length) => decoder.decode(input.slice(start, end));
var toHexString = (input, start = 0, end = input.length) => input.slice(start, end).reduce((memo, i) => memo + `0${i.toString(16)}`.slice(-2), "");
var getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
var readInt16LE = (input, offset = 0) => getView(input, offset).getInt16(0, true);
var readUInt16BE = (input, offset = 0) => getView(input, offset).getUint16(0, false);
var readUInt16LE = (input, offset = 0) => getView(input, offset).getUint16(0, true);
var readUInt24LE = (input, offset = 0) => {
  const view = getView(input, offset);
  return view.getUint16(0, true) + (view.getUint8(2) << 16);
};
var readInt32LE = (input, offset = 0) => getView(input, offset).getInt32(0, true);
var readUInt32BE = (input, offset = 0) => getView(input, offset).getUint32(0, false);
var readUInt32LE = (input, offset = 0) => getView(input, offset).getUint32(0, true);
var methods = {
  readUInt16BE,
  readUInt16LE,
  readUInt32BE,
  readUInt32LE
};
function readUInt(input, bits, offset = 0, isBigEndian = false) {
  const endian = isBigEndian ? "BE" : "LE";
  const methodName = `readUInt${bits}${endian}`;
  return methods[methodName](input, offset);
}
var BOX_HEADER_SIZE = 8;
function readBox(input, view, base, offset, boxCode) {
  if (input.length - offset < BOX_HEADER_SIZE)
    return void 0;
  const boxSize = view.getUint32(base + offset, false);
  if (input.length - offset < boxSize)
    return void 0;
  return {
    offset,
    size: boxSize,
    matches: view.getUint32(base + 4 + offset, false) === boxCode
  };
}
var boxViews = /* @__PURE__ */ new WeakMap();
function getBoxView(input) {
  let view = boxViews.get(input.buffer);
  if (!view) {
    view = new DataView(input.buffer);
    boxViews.set(input.buffer, view);
  }
  return view;
}
function findBox(input, boxName, startOffset) {
  const view = getBoxView(input);
  const boxCode = boxName.charCodeAt(0) << 24 | boxName.charCodeAt(1) << 16 | boxName.charCodeAt(2) << 8 | boxName.charCodeAt(3);
  const base = input.byteOffset;
  let currentOffset = startOffset;
  while (currentOffset < input.length) {
    if (input.length - currentOffset < 4)
      break;
    if (view.getUint32(base + currentOffset, false) < BOX_HEADER_SIZE) {
      currentOffset += BOX_HEADER_SIZE;
      continue;
    }
    const box = readBox(input, view, base, currentOffset, boxCode);
    if (!box)
      break;
    if (box.matches) {
      return { name: boxName, offset: box.offset, size: box.size };
    }
    currentOffset += box.size;
  }
  return void 0;
}

// node_modules/image-size/dist/esm/types/bmp.js
var BMP = {
  validate: (input) => toUTF8String(input, 0, 2) === "BM",
  calculate: (input) => ({
    height: Math.abs(readInt32LE(input, 22)),
    width: readUInt32LE(input, 18)
  })
};

// node_modules/image-size/dist/esm/types/ico.js
var TYPE_ICON = 1;
var SIZE_HEADER = 2 + 2 + 2;
var SIZE_IMAGE_ENTRY = 1 + 1 + 1 + 1 + 2 + 2 + 4 + 4;
function getSizeFromOffset(input, offset) {
  const value = input[offset];
  return value === 0 ? 256 : value;
}
function getImageSize(input, imageIndex) {
  const offset = SIZE_HEADER + imageIndex * SIZE_IMAGE_ENTRY;
  return {
    height: getSizeFromOffset(input, offset + 1),
    width: getSizeFromOffset(input, offset)
  };
}
var ICO = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0)
      return false;
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_ICON;
  },
  calculate(input) {
    const nbImages = readUInt16LE(input, 4);
    if (SIZE_HEADER + nbImages * SIZE_IMAGE_ENTRY > input.length) {
      throw new TypeError("Invalid ICO");
    }
    const imageSize2 = getImageSize(input, 0);
    if (nbImages === 1)
      return imageSize2;
    const images = [];
    for (let imageIndex = 0; imageIndex < nbImages; imageIndex += 1) {
      images.push(getImageSize(input, imageIndex));
    }
    return {
      width: imageSize2.width,
      height: imageSize2.height,
      images
    };
  }
};

// node_modules/image-size/dist/esm/types/cur.js
var TYPE_CURSOR = 2;
var CUR = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0)
      return false;
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_CURSOR;
  },
  calculate: (input) => ICO.calculate(input)
};

// node_modules/image-size/dist/esm/types/dds.js
var DDS = {
  validate: (input) => readUInt32LE(input, 0) === 542327876,
  calculate: (input) => ({
    height: readUInt32LE(input, 12),
    width: readUInt32LE(input, 16)
  })
};

// node_modules/image-size/dist/esm/types/gif.js
var gifRegexp = /^GIF8[79]a/;
var GIF = {
  validate: (input) => gifRegexp.test(toUTF8String(input, 0, 6)),
  calculate: (input) => ({
    height: readUInt16LE(input, 8),
    width: readUInt16LE(input, 6)
  })
};

// node_modules/image-size/dist/esm/types/heif.js
var brandMap = {
  avif: "avif",
  mif1: "heif",
  msf1: "heif",
  heic: "heic",
  heix: "heic",
  hevc: "heic",
  hevx: "heic"
};
var HEIF = {
  validate(input) {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "ftyp")
      return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox)
      return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand in brandMap;
  },
  calculate(input) {
    const metaBox = findBox(input, "meta", 0);
    const iprpBox = metaBox && findBox(input, "iprp", metaBox.offset + 12);
    const ipcoBox = iprpBox && findBox(input, "ipco", iprpBox.offset + 8);
    if (!ipcoBox) {
      throw new TypeError("Invalid HEIF, no ipco box found");
    }
    const type = toUTF8String(input, 8, 12);
    const images = [];
    let currentOffset = ipcoBox.offset + 8;
    while (currentOffset < ipcoBox.offset + ipcoBox.size) {
      const ispeBox = findBox(input, "ispe", currentOffset);
      if (!ispeBox)
        break;
      if (ispeBox.size < 20) {
        throw new TypeError("Invalid HEIF");
      }
      const rawWidth = readUInt32BE(input, ispeBox.offset + 12);
      const rawHeight = readUInt32BE(input, ispeBox.offset + 16);
      const clapBox = findBox(input, "clap", currentOffset);
      let width = rawWidth;
      const height = rawHeight;
      if (clapBox && clapBox.size >= 16 && clapBox.offset < ipcoBox.offset + ipcoBox.size) {
        const cropRight = readUInt32BE(input, clapBox.offset + 12);
        width = rawWidth - cropRight;
      }
      images.push({ height, width });
      const nextOffset = ispeBox.offset + ispeBox.size;
      if (nextOffset <= currentOffset) {
        throw new TypeError("Invalid HEIF");
      }
      currentOffset = nextOffset;
    }
    if (images.length === 0) {
      throw new TypeError("Invalid HEIF, no sizes found");
    }
    return {
      width: images[0].width,
      height: images[0].height,
      type,
      ...images.length > 1 ? { images } : {}
    };
  }
};

// node_modules/image-size/dist/esm/types/icns.js
var SIZE_HEADER2 = 4 + 4;
var FILE_LENGTH_OFFSET = 4;
var ENTRY_LENGTH_OFFSET = 4;
var ICON_TYPE_SIZE = {
  ICON: 32,
  "ICN#": 32,
  "icm#": 16,
  icm4: 16,
  icm8: 16,
  "ics#": 16,
  ics4: 16,
  ics8: 16,
  is32: 16,
  s8mk: 16,
  icp4: 16,
  icl4: 32,
  icl8: 32,
  il32: 32,
  l8mk: 32,
  icp5: 32,
  ic11: 32,
  ich4: 48,
  ich8: 48,
  ih32: 48,
  h8mk: 48,
  icp6: 64,
  ic12: 32,
  it32: 128,
  t8mk: 128,
  ic07: 128,
  ic08: 256,
  ic13: 256,
  ic09: 512,
  ic14: 512,
  ic10: 1024
};
function readImageHeader(input, imageOffset) {
  const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;
  if (imageLengthOffset + 4 > input.length) {
    throw new TypeError("Invalid ICNS");
  }
  return [
    toUTF8String(input, imageOffset, imageLengthOffset),
    readUInt32BE(input, imageLengthOffset)
  ];
}
function getImageSize2(type) {
  const size = ICON_TYPE_SIZE[type];
  return { width: size, height: size, type };
}
var ICNS = {
  validate: (input) => toUTF8String(input, 0, 4) === "icns",
  calculate(input) {
    const inputLength = input.length;
    const fileLength = readUInt32BE(input, FILE_LENGTH_OFFSET);
    let imageOffset = SIZE_HEADER2;
    const images = [];
    while (imageOffset < fileLength && imageOffset < inputLength) {
      const imageHeader = readImageHeader(input, imageOffset);
      const entryLength = imageHeader[1];
      if (entryLength < 8) {
        throw new TypeError("Invalid ICNS");
      }
      const imageSize2 = getImageSize2(imageHeader[0]);
      images.push(imageSize2);
      imageOffset += entryLength;
    }
    if (images.length === 0) {
      throw new TypeError("Invalid ICNS, no sizes found");
    }
    return {
      width: images[0].width,
      height: images[0].height,
      ...images.length > 1 ? { images } : {}
    };
  }
};

// node_modules/image-size/dist/esm/types/j2c.js
var J2C = {
  validate: (input) => readUInt32BE(input, 0) === 4283432785,
  calculate: (input) => ({
    height: readUInt32BE(input, 12),
    width: readUInt32BE(input, 8)
  })
};

// node_modules/image-size/dist/esm/types/jp2.js
var JP2 = {
  validate(input) {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "jP  ")
      return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox)
      return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand === "jp2 ";
  },
  calculate(input) {
    const jp2hBox = findBox(input, "jp2h", 0);
    const ihdrBox = jp2hBox && findBox(input, "ihdr", jp2hBox.offset + 8);
    if (ihdrBox) {
      return {
        height: readUInt32BE(input, ihdrBox.offset + 8),
        width: readUInt32BE(input, ihdrBox.offset + 12)
      };
    }
    throw new TypeError("Unsupported JPEG 2000 format");
  }
};

// node_modules/image-size/dist/esm/types/jpg.js
var EXIF_MARKER = "45786966";
var APP1_DATA_SIZE_BYTES = 2;
var EXIF_HEADER_BYTES = 6;
var TIFF_BYTE_ALIGN_BYTES = 2;
var BIG_ENDIAN_BYTE_ALIGN = "4d4d";
var LITTLE_ENDIAN_BYTE_ALIGN = "4949";
var IDF_ENTRY_BYTES = 12;
var NUM_DIRECTORY_ENTRIES_BYTES = 2;
function isEXIF(input) {
  return toHexString(input, 2, 6) === EXIF_MARKER;
}
function extractSize(input, index) {
  return {
    height: readUInt16BE(input, index),
    width: readUInt16BE(input, index + 2)
  };
}
function extractOrientation(exifBlock, isBigEndian) {
  const idfOffset = 8;
  const offset = EXIF_HEADER_BYTES + idfOffset;
  const idfDirectoryEntries = readUInt(exifBlock, 16, offset, isBigEndian);
  for (let directoryEntryNumber = 0; directoryEntryNumber < idfDirectoryEntries; directoryEntryNumber++) {
    const start = offset + NUM_DIRECTORY_ENTRIES_BYTES + directoryEntryNumber * IDF_ENTRY_BYTES;
    const end = start + IDF_ENTRY_BYTES;
    if (start > exifBlock.length) {
      return;
    }
    const block = exifBlock.slice(start, end);
    const tagNumber = readUInt(block, 16, 0, isBigEndian);
    if (tagNumber === 274) {
      const dataFormat = readUInt(block, 16, 2, isBigEndian);
      if (dataFormat !== 3) {
        return;
      }
      const numberOfComponents = readUInt(block, 32, 4, isBigEndian);
      if (numberOfComponents !== 1) {
        return;
      }
      return readUInt(block, 16, 8, isBigEndian);
    }
  }
}
function validateExifBlock(input, index) {
  const exifBlock = input.slice(APP1_DATA_SIZE_BYTES, index);
  const byteAlign = toHexString(exifBlock, EXIF_HEADER_BYTES, EXIF_HEADER_BYTES + TIFF_BYTE_ALIGN_BYTES);
  const isBigEndian = byteAlign === BIG_ENDIAN_BYTE_ALIGN;
  const isLittleEndian = byteAlign === LITTLE_ENDIAN_BYTE_ALIGN;
  if (isBigEndian || isLittleEndian) {
    return extractOrientation(exifBlock, isBigEndian);
  }
}
function validateInput(input, index) {
  if (index > input.length) {
    throw new TypeError("Corrupt JPG, exceeded buffer limits");
  }
}
var JPG = {
  validate: (input) => toHexString(input, 0, 2) === "ffd8",
  calculate(_input) {
    let input = _input.slice(4);
    let orientation;
    let next;
    while (input.length) {
      const i = readUInt16BE(input, 0);
      validateInput(input, i);
      if (input[i] !== 255) {
        input = input.subarray(1);
        continue;
      }
      if (isEXIF(input)) {
        orientation = validateExifBlock(input, i);
      }
      next = input[i + 1];
      if (next === 192 || next === 193 || next === 194) {
        const size = extractSize(input, i + 5);
        if (!orientation) {
          return size;
        }
        return {
          height: size.height,
          orientation,
          width: size.width
        };
      }
      input = input.subarray(i + 2);
    }
    throw new TypeError("Invalid JPG, no size found");
  }
};

// node_modules/image-size/dist/esm/utils/bit-reader.js
var BitReader = class {
  input;
  endianness;
  byteOffset = 2;
  bitOffset = 0;
  constructor(input, endianness) {
    this.input = input;
    this.endianness = endianness;
  }
  getBits(length = 1) {
    let result = 0;
    let bitsRead = 0;
    while (bitsRead < length) {
      if (this.byteOffset >= this.input.length) {
        throw new Error("Reached end of input");
      }
      const currentByte = this.input[this.byteOffset];
      const bitsLeft = 8 - this.bitOffset;
      const bitsToRead = Math.min(length - bitsRead, bitsLeft);
      if (this.endianness === "little-endian") {
        const mask = (1 << bitsToRead) - 1;
        const bits = currentByte >> this.bitOffset & mask;
        result |= bits << bitsRead;
      } else {
        const mask = (1 << bitsToRead) - 1 << 8 - this.bitOffset - bitsToRead;
        const bits = (currentByte & mask) >> 8 - this.bitOffset - bitsToRead;
        result = result << bitsToRead | bits;
      }
      bitsRead += bitsToRead;
      this.bitOffset += bitsToRead;
      if (this.bitOffset === 8) {
        this.byteOffset++;
        this.bitOffset = 0;
      }
    }
    return result;
  }
};

// node_modules/image-size/dist/esm/types/jxl-stream.js
function calculateImageDimension(reader, isSmallImage) {
  if (isSmallImage) {
    return 8 * (1 + reader.getBits(5));
  }
  const sizeClass = reader.getBits(2);
  const extraBits = [9, 13, 18, 30][sizeClass];
  return 1 + reader.getBits(extraBits);
}
function calculateImageWidth(reader, isSmallImage, widthMode, height) {
  if (isSmallImage && widthMode === 0) {
    return 8 * (1 + reader.getBits(5));
  }
  if (widthMode === 0) {
    return calculateImageDimension(reader, false);
  }
  const aspectRatios = [1, 1.2, 4 / 3, 1.5, 16 / 9, 5 / 4, 2];
  return Math.floor(height * aspectRatios[widthMode - 1]);
}
var JXLStream = {
  validate: (input) => {
    return toHexString(input, 0, 2) === "ff0a";
  },
  calculate(input) {
    const reader = new BitReader(input, "little-endian");
    const isSmallImage = reader.getBits(1) === 1;
    const height = calculateImageDimension(reader, isSmallImage);
    const widthMode = reader.getBits(3);
    const width = calculateImageWidth(reader, isSmallImage, widthMode, height);
    return { width, height };
  }
};

// node_modules/image-size/dist/esm/types/jxl.js
function extractCodestream(input) {
  const jxlcBox = findBox(input, "jxlc", 0);
  if (jxlcBox) {
    return input.subarray(jxlcBox.offset + 8, jxlcBox.offset + jxlcBox.size);
  }
  const partialStreams = extractPartialStreams(input);
  if (partialStreams.length > 0) {
    return concatenateCodestreams(partialStreams);
  }
  return void 0;
}
function extractPartialStreams(input) {
  const partialStreams = [];
  let offset = 0;
  while (offset < input.length) {
    const jxlpBox = findBox(input, "jxlp", offset);
    if (!jxlpBox)
      break;
    if (jxlpBox.size < 12) {
      throw new TypeError("Invalid JXL");
    }
    partialStreams.push(input.slice(jxlpBox.offset + 12, jxlpBox.offset + jxlpBox.size));
    offset = jxlpBox.offset + jxlpBox.size;
  }
  return partialStreams;
}
function concatenateCodestreams(partialCodestreams) {
  const totalLength = partialCodestreams.reduce((acc, curr) => acc + curr.length, 0);
  const codestream = new Uint8Array(Math.min(16, totalLength));
  let position = 0;
  for (const partial of partialCodestreams) {
    if (position >= codestream.length)
      break;
    const byteCount = Math.min(partial.length, codestream.length - position);
    codestream.set(partial.subarray(0, byteCount), position);
    position += byteCount;
  }
  return codestream;
}
var JXL = {
  validate: (input) => {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "JXL ")
      return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox)
      return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand === "jxl ";
  },
  calculate(input) {
    const codestream = extractCodestream(input);
    if (codestream)
      return JXLStream.calculate(codestream);
    throw new TypeError("Invalid JXL");
  }
};

// node_modules/image-size/dist/esm/types/ktx.js
var KTX = {
  validate: (input) => {
    const signature = toUTF8String(input, 1, 7);
    return ["KTX 11", "KTX 20"].includes(signature);
  },
  calculate: (input) => {
    const type = input[5] === 49 ? "ktx" : "ktx2";
    const offset = type === "ktx" ? 36 : 20;
    return {
      height: readUInt32LE(input, offset + 4),
      width: readUInt32LE(input, offset),
      type
    };
  }
};

// node_modules/image-size/dist/esm/types/png.js
var pngSignature = "PNG\r\n\n";
var pngImageHeaderChunkName = "IHDR";
var pngFriedChunkName = "CgBI";
var PNG = {
  validate(input) {
    if (pngSignature === toUTF8String(input, 1, 8)) {
      let chunkName = toUTF8String(input, 12, 16);
      if (chunkName === pngFriedChunkName) {
        chunkName = toUTF8String(input, 28, 32);
      }
      if (chunkName !== pngImageHeaderChunkName) {
        throw new TypeError("Invalid PNG");
      }
      return true;
    }
    return false;
  },
  calculate(input) {
    if (toUTF8String(input, 12, 16) === pngFriedChunkName) {
      return {
        height: readUInt32BE(input, 36),
        width: readUInt32BE(input, 32)
      };
    }
    return {
      height: readUInt32BE(input, 20),
      width: readUInt32BE(input, 16)
    };
  }
};

// node_modules/image-size/dist/esm/types/pnm.js
var PNMTypes = {
  P1: "pbm/ascii",
  P2: "pgm/ascii",
  P3: "ppm/ascii",
  P4: "pbm",
  P5: "pgm",
  P6: "ppm",
  P7: "pam",
  PF: "pfm"
};
var HEADER_SCAN_LIMIT = 64;
var PAM_HEADER_LIMIT = 256;
var isWhitespace = (byte) => byte === 32 || byte === 9 || byte === 10 || byte === 13;
var isEndOfLine = (byte) => byte === 10 || byte === 13;
var handlers = {
  default: (input) => {
    const end = Math.min(input.length, HEADER_SCAN_LIMIT);
    const tokens = [];
    let token = "";
    let inComment = false;
    for (let i = 2; i < end && tokens.length < 2; i++) {
      const byte = input[i];
      if (inComment) {
        inComment = !isEndOfLine(byte);
      } else if (byte === 35) {
        inComment = true;
      } else if (isWhitespace(byte)) {
        if (token) {
          tokens.push(token);
          token = "";
        }
      } else {
        token += String.fromCharCode(byte);
      }
    }
    if (token && tokens.length < 2)
      tokens.push(token);
    if (tokens.length < 2) {
      throw new TypeError("Invalid PNM");
    }
    return {
      width: Number.parseInt(tokens[0], 10),
      height: Number.parseInt(tokens[1], 10)
    };
  },
  pam: (input) => {
    const header = toUTF8String(input, 0, Math.min(input.length, PAM_HEADER_LIMIT));
    const size = {};
    for (const line of header.split(/[\r\n]+/)) {
      if (line.length > 16 || line.charCodeAt(0) > 128) {
        continue;
      }
      const [key, value] = line.split(" ");
      if (key && value) {
        size[key.toLowerCase()] = Number.parseInt(value, 10);
      }
      if (size.height && size.width) {
        break;
      }
    }
    if (size.height && size.width) {
      return {
        height: size.height,
        width: size.width
      };
    }
    throw new TypeError("Invalid PAM");
  }
};
var PNM = {
  validate: (input) => toUTF8String(input, 0, 2) in PNMTypes,
  calculate(input) {
    const signature = toUTF8String(input, 0, 2);
    const type = PNMTypes[signature];
    const handler = handlers[type] || handlers.default;
    return handler(input);
  }
};

// node_modules/image-size/dist/esm/types/psd.js
var PSD = {
  validate: (input) => toUTF8String(input, 0, 4) === "8BPS",
  calculate: (input) => ({
    height: readUInt32BE(input, 14),
    width: readUInt32BE(input, 18)
  })
};

// node_modules/image-size/dist/esm/types/svg.js
var svgReg = /<svg\s([^>"']|"[^"]*"|'[^']*')*>/;
var extractorRegExps = {
  height: /\sheight=(['"])([^%]+?)\1/,
  root: svgReg,
  viewbox: /\sviewBox=(['"])(.+?)\1/i,
  width: /\swidth=(['"])([^%]+?)\1/
};
var INCH_CM = 2.54;
var units = {
  in: 96,
  cm: 96 / INCH_CM,
  em: 16,
  ex: 8,
  m: 96 / INCH_CM * 100,
  mm: 96 / INCH_CM / 10,
  pc: 96 / 72 / 12,
  pt: 96 / 72,
  px: 1
};
var unitsReg = new RegExp(`^([0-9.]+(?:e\\d+)?)(${Object.keys(units).join("|")})?$`);
function parseLength(len) {
  const m = unitsReg.exec(len);
  if (!m) {
    return void 0;
  }
  return Math.round(Number(m[1]) * (units[m[2]] || 1));
}
function parseViewbox(viewbox) {
  const bounds = viewbox.split(" ");
  return {
    height: parseLength(bounds[3]),
    width: parseLength(bounds[2])
  };
}
function parseAttributes(root) {
  const width = root.match(extractorRegExps.width);
  const height = root.match(extractorRegExps.height);
  const viewbox = root.match(extractorRegExps.viewbox);
  return {
    height: height && parseLength(height[2]),
    viewbox: viewbox && parseViewbox(viewbox[2]),
    width: width && parseLength(width[2])
  };
}
function calculateByDimensions(attrs2) {
  return {
    height: attrs2.height,
    width: attrs2.width
  };
}
function calculateByViewbox(attrs2, viewbox) {
  const ratio = viewbox.width / viewbox.height;
  if (attrs2.width) {
    return {
      height: Math.floor(attrs2.width / ratio),
      width: attrs2.width
    };
  }
  if (attrs2.height) {
    return {
      height: attrs2.height,
      width: Math.floor(attrs2.height * ratio)
    };
  }
  return {
    height: viewbox.height,
    width: viewbox.width
  };
}
var SVG = {
  validate: (input) => svgReg.test(toUTF8String(input, 0, 1e3)),
  calculate(input) {
    const root = toUTF8String(input).match(extractorRegExps.root);
    if (root) {
      const attrs2 = parseAttributes(root[0]);
      if (attrs2.width && attrs2.height) {
        return calculateByDimensions(attrs2);
      }
      if (attrs2.viewbox) {
        return calculateByViewbox(attrs2, attrs2.viewbox);
      }
    }
    throw new TypeError("Invalid SVG");
  }
};

// node_modules/image-size/dist/esm/types/tga.js
var TGA = {
  validate(input) {
    return readUInt16LE(input, 0) === 0 && readUInt16LE(input, 4) === 0;
  },
  calculate(input) {
    return {
      height: readUInt16LE(input, 14),
      width: readUInt16LE(input, 12)
    };
  }
};

// node_modules/image-size/dist/esm/types/tiff.js
var CONSTANTS = {
  TAG: {
    WIDTH: 256,
    HEIGHT: 257,
    COMPRESSION: 259
  },
  TYPE: {
    SHORT: 3,
    LONG: 4,
    LONG8: 16
  },
  ENTRY_SIZE: {
    STANDARD: 12,
    BIG: 20
  },
  COUNT_SIZE: {
    STANDARD: 2,
    BIG: 8
  }
};
function readIFD(input, { isBigEndian, isBigTiff }) {
  const view = new DataView(input.buffer, input.byteOffset);
  const le = !isBigEndian;
  const ifdOffset = isBigTiff ? Number(view.getBigUint64(8, le)) : view.getUint32(4, le);
  const entryCountSize = isBigTiff ? CONSTANTS.COUNT_SIZE.BIG : CONSTANTS.COUNT_SIZE.STANDARD;
  return input.slice(ifdOffset + entryCountSize);
}
function readTagValue(view, type, offset, le) {
  switch (type) {
    case CONSTANTS.TYPE.SHORT:
      return view.getUint16(offset, le);
    case CONSTANTS.TYPE.LONG:
      return view.getUint32(offset, le);
    case CONSTANTS.TYPE.LONG8: {
      const value = Number(view.getBigUint64(offset, le));
      if (value > Number.MAX_SAFE_INTEGER) {
        throw new TypeError("Value too large");
      }
      return value;
    }
    default:
      return 0;
  }
}
function extractTags(input, { isBigEndian, isBigTiff }) {
  const tags = {};
  const entrySize = isBigTiff ? CONSTANTS.ENTRY_SIZE.BIG : CONSTANTS.ENTRY_SIZE.STANDARD;
  const valueOffset = isBigTiff ? 12 : 8;
  const view = new DataView(input.buffer, input.byteOffset);
  const le = !isBigEndian;
  for (let offset = 0; offset + entrySize < input.length; offset += entrySize) {
    const code = view.getUint16(offset, le);
    const type = view.getUint16(offset + 2, le);
    const length = isBigTiff ? Number(view.getBigUint64(offset + 4, le)) : view.getUint32(offset + 4, le);
    if (code === 0)
      break;
    if (length === 1 && (type === CONSTANTS.TYPE.SHORT || type === CONSTANTS.TYPE.LONG || isBigTiff && type === CONSTANTS.TYPE.LONG8)) {
      tags[code] = readTagValue(view, type, offset + valueOffset, le);
    }
  }
  return tags;
}
function determineFormat(input) {
  const signature = toUTF8String(input, 0, 2);
  const isBigEndian = signature === "MM";
  const view = new DataView(input.buffer, input.byteOffset);
  const version = view.getUint16(2, !isBigEndian);
  return {
    isBigEndian,
    isBigTiff: version === 43
  };
}
function validateBigTIFFHeader(input, isBigEndian) {
  const view = new DataView(input.buffer, input.byteOffset);
  const le = !isBigEndian;
  const byteSize = view.getUint16(4, le);
  const reserved = view.getUint16(6, le);
  if (byteSize !== 8 || reserved !== 0) {
    throw new TypeError("Invalid BigTIFF header");
  }
}
var signatures = /* @__PURE__ */ new Set([
  "49492a00",
  "4d4d002a",
  "49492b00",
  "4d4d002b"
]);
var TIFF = {
  validate: (input) => {
    const signature = toHexString(input, 0, 4);
    return signatures.has(signature);
  },
  calculate(input) {
    const format = determineFormat(input);
    if (format.isBigTiff) {
      validateBigTIFFHeader(input, format.isBigEndian);
    }
    const ifdBuffer = readIFD(input, format);
    const tags = extractTags(ifdBuffer, format);
    const info = {
      height: tags[CONSTANTS.TAG.HEIGHT],
      width: tags[CONSTANTS.TAG.WIDTH],
      type: format.isBigTiff ? "bigtiff" : "tiff"
    };
    if (tags[CONSTANTS.TAG.COMPRESSION]) {
      info.compression = tags[CONSTANTS.TAG.COMPRESSION];
    }
    if (!info.width || !info.height) {
      throw new TypeError("Invalid Tiff. Missing tags");
    }
    return info;
  }
};

// node_modules/image-size/dist/esm/types/webp.js
function calculateExtended(input) {
  return {
    height: 1 + readUInt24LE(input, 7),
    width: 1 + readUInt24LE(input, 4)
  };
}
function calculateLossless(input) {
  return {
    height: 1 + ((input[4] & 15) << 10 | input[3] << 2 | (input[2] & 192) >> 6),
    width: 1 + ((input[2] & 63) << 8 | input[1])
  };
}
function calculateLossy(input) {
  return {
    height: readInt16LE(input, 8) & 16383,
    width: readInt16LE(input, 6) & 16383
  };
}
var WEBP = {
  validate(input) {
    const riffHeader = "RIFF" === toUTF8String(input, 0, 4);
    const webpHeader = "WEBP" === toUTF8String(input, 8, 12);
    const vp8Header = "VP8" === toUTF8String(input, 12, 15);
    return riffHeader && webpHeader && vp8Header;
  },
  calculate(_input) {
    const chunkHeader = toUTF8String(_input, 12, 16);
    const input = _input.slice(20, 30);
    if (chunkHeader === "VP8X") {
      const extendedHeader = input[0];
      const validStart = (extendedHeader & 192) === 0;
      const validEnd = (extendedHeader & 1) === 0;
      if (validStart && validEnd) {
        return calculateExtended(input);
      }
      throw new TypeError("Invalid WebP");
    }
    if (chunkHeader === "VP8 " && input[0] !== 47) {
      return calculateLossy(input);
    }
    const signature = toHexString(input, 3, 6);
    if (chunkHeader === "VP8L" && signature !== "9d012a") {
      return calculateLossless(input);
    }
    throw new TypeError("Invalid WebP");
  }
};

// node_modules/image-size/dist/esm/types/index.js
var typeHandlers = /* @__PURE__ */ new Map([
  ["bmp", BMP],
  ["cur", CUR],
  ["dds", DDS],
  ["gif", GIF],
  ["heif", HEIF],
  ["icns", ICNS],
  ["ico", ICO],
  ["j2c", J2C],
  ["jp2", JP2],
  ["jpg", JPG],
  ["jxl", JXL],
  ["jxl-stream", JXLStream],
  ["ktx", KTX],
  ["png", PNG],
  ["pnm", PNM],
  ["psd", PSD],
  ["svg", SVG],
  ["tga", TGA],
  ["tiff", TIFF],
  ["webp", WEBP]
]);
var types = Array.from(typeHandlers.keys());

// node_modules/image-size/dist/esm/detector.js
var firstBytes = /* @__PURE__ */ new Map([
  [0, ["cur", "heif", "ico", "jp2", "jxl", "tga"]],
  [56, ["psd"]],
  [60, ["svg"]],
  [66, ["bmp"]],
  [68, ["dds"]],
  [71, ["gif"]],
  [73, ["tiff"]],
  [77, ["tiff"]],
  [80, ["pnm"]],
  [82, ["webp"]],
  [105, ["icns"]],
  [137, ["png"]],
  [171, ["ktx"]],
  [255, ["j2c", "jpg", "jxl-stream"]]
]);
function detector(input) {
  const byte = input[0];
  const candidates = firstBytes.get(byte);
  const predicate = (type) => typeHandlers.get(type)?.validate(input);
  return candidates?.find(predicate) || types.find(predicate);
}

// node_modules/image-size/dist/esm/lookup.js
var globalOptions = {
  disabledTypes: []
};
function imageSize(input) {
  const type = detector(input);
  if (typeof type !== "undefined") {
    if (globalOptions.disabledTypes.indexOf(type) > -1) {
      throw new TypeError(`disabled file type: ${type}`);
    }
    const size = typeHandlers.get(type)?.calculate(input);
    if (size !== void 0) {
      size.type = size.type ?? type;
      if (size.images && size.images.length > 1) {
        const largestImage = size.images.reduce((largest, current) => {
          return current.width * current.height > largest.width * largest.height ? current : largest;
        }, size.images[0]);
        size.width = largestImage.width;
        size.height = largestImage.height;
      }
      return size;
    }
  }
  throw new TypeError(`unsupported file type: ${type}`);
}

// src/worker/metadata-extractor.ts
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash as createHash2 } from "node:crypto";

// node_modules/fast-xml-parser/src/util.js
var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
var regexName = new RegExp("^" + nameRegexp + "$");
function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}
var isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === "undefined");
};
function isExist(v) {
  return typeof v !== "undefined";
}
var DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  "hasOwnProperty",
  "toString",
  "valueOf",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__"
];
var criticalProperties = ["__proto__", "constructor", "prototype"];

// node_modules/fast-xml-parser/src/validator.js
var defaultOptions = {
  allowBooleanAttributes: false,
  //A tag can have attributes without any value
  unpairedTags: []
};
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);
  const tags = [];
  let tagFound = false;
  let reachedRoot = false;
  if (xmlData[0] === "\uFEFF") {
    xmlData = xmlData.substr(1);
  }
  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === "<") {
      let tagStartPos = i;
      i++;
      if (xmlData[i] === "!") {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === "/") {
          closingTag = true;
          i++;
        }
        let tagName = "";
        for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        if (tagName[tagName.length - 1] === "/") {
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
        }
        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;
        if (attrStr[attrStr.length - 1] === "/") {
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
          } else {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject(
                "InvalidTag",
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
          if (reachedRoot === true) {
            return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            if (xmlData[i + 1] === "!") {
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === "?") {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === "&") {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        }
        if (xmlData[i] === "<") {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }
  if (!tagFound) {
    return getErrorObject("InvalidXml", "Start tag expected.", 1);
  } else if (tags.length == 1) {
    return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
  }
  return true;
}
function isWhiteSpace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == "?" || xmlData[i] == " ") {
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === "xml") {
        return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}
function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        angleBracketsCount++;
      } else if (xmlData[i] === ">") {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  }
  return i;
}
var doubleQuote = '"';
var singleQuote = "'";
function readAttributeStr(xmlData, i) {
  let attrStr = "";
  let startChar = "";
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === "") {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
      } else {
        startChar = "";
      }
    } else if (xmlData[i] === ">") {
      if (startChar === "") {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== "") {
    return false;
  }
  return {
    value: attrStr,
    index: i,
    tagClosed
  };
}
function scanAttributeTokens(attrStr) {
  const tokens = [];
  const len = attrStr.length;
  let i = 0;
  while (i < len) {
    const tokenStart = i;
    while (i < len && isWhiteSpace(attrStr[i])) i++;
    if (i >= len) break;
    if (attrStr[i] === "=") {
      i = tokenStart + 1;
      continue;
    }
    const leadingWs = attrStr.slice(tokenStart, i);
    const nameStart = i;
    while (i < len && !isWhiteSpace(attrStr[i]) && attrStr[i] !== "=") i++;
    const name = attrStr.slice(nameStart, i);
    let equalsGroup;
    let j = i;
    while (j < len && isWhiteSpace(attrStr[j])) j++;
    if (j < len && attrStr[j] === "=") {
      equalsGroup = attrStr.slice(i, j + 1);
      i = j + 1;
    }
    let quoteChar;
    let value;
    let k = i;
    while (k < len && isWhiteSpace(attrStr[k])) k++;
    if (k < len && (attrStr[k] === '"' || attrStr[k] === "'")) {
      const valueStart = k + 1;
      const closeIdx = attrStr.indexOf(attrStr[k], valueStart);
      if (closeIdx !== -1) {
        quoteChar = attrStr[k];
        value = attrStr.slice(valueStart, closeIdx);
        i = closeIdx + 1;
      }
    }
    const token = { startIndex: tokenStart };
    token[1] = leadingWs;
    token[2] = name;
    token[3] = equalsGroup;
    token[4] = quoteChar !== void 0 ? true : void 0;
    token[5] = quoteChar;
    token[6] = value;
    tokens.push(token);
  }
  return tokens;
}
function validateAttributeString(attrStr, options) {
  const matches = scanAttributeTokens(attrStr);
  const attrNames = {};
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
      return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }
  return true;
}
function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === "x") {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ";")
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}
function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ";")
    return -1;
  if (xmlData[i] === "#") {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ";")
      break;
    return -1;
  }
  return i;
}
function getErrorObject(code, message2, lineNumber) {
  return {
    err: {
      code,
      msg: message2,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}
function validateAttrName(attrName) {
  return isName(attrName);
}
function validateTagName(tagname) {
  return isName(tagname);
}
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

// node_modules/@nodable/entities/src/entities.js
var CURRENCY = {
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  euro: "\u20AC",
  dollar: "$",
  fnof: "\u0192",
  inr: "\u20B9",
  af: "\u060B",
  birr: "\u1265\u122D",
  peso: "\u20B1",
  rub: "\u20BD",
  won: "\u20A9",
  yuan: "\xA5",
  cedil: "\xB8"
};
var XML = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"'
};
var COMMON_HTML = {
  nbsp: "\xA0",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\xAB",
  raquo: "\xBB",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  para: "\xB6",
  sect: "\xA7",
  deg: "\xB0",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE"
};

// node_modules/@nodable/entities/src/EntityDecoder.js
var ENTITY_ACTION = Object.freeze({
  /** Resolve and expand the entity normally. */
  ALLOW: "allow",
  /** Silently skip this entity — it will not be registered. */
  BLOCK: "block",
  /** Throw an error, aborting entity registration entirely. */
  THROW: "throw"
});
var SPECIAL_CHARS = new Set("!?\\\\/[]$%{}^&*()<>|+");
function validateEntityName(name) {
  if (name[0] === "#") {
    throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
  }
  for (const ch of name) {
    if (SPECIAL_CHARS.has(ch)) {
      throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
    }
  }
  return name;
}
function mergeEntityMaps(...maps) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map)) {
      const raw = map[key];
      if (typeof raw === "string") {
        out[key] = raw;
      } else if (raw && typeof raw === "object" && raw.val !== void 0) {
        const val = raw.val;
        if (typeof val === "string") {
          out[key] = val;
        }
      }
    }
  }
  return out;
}
var LIMIT_TIER_EXTERNAL = "external";
var LIMIT_TIER_BASE = "base";
var LIMIT_TIER_ALL = "all";
function parseLimitTiers(raw) {
  if (!raw || raw === LIMIT_TIER_EXTERNAL) return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
  if (raw === LIMIT_TIER_ALL) return /* @__PURE__ */ new Set([LIMIT_TIER_ALL]);
  if (raw === LIMIT_TIER_BASE) return /* @__PURE__ */ new Set([LIMIT_TIER_BASE]);
  if (Array.isArray(raw)) return new Set(raw);
  return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
}
var NCR_LEVEL = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 });
var XML10_ALLOWED_C0 = /* @__PURE__ */ new Set([9, 10, 13]);
function parseNCRConfig(ncr) {
  if (!ncr) {
    return { xmlVersion: 1, onLevel: NCR_LEVEL.allow, nullLevel: NCR_LEVEL.remove };
  }
  const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1;
  const onLevel = NCR_LEVEL[ncr.onNCR] ?? NCR_LEVEL.allow;
  const nullLevel = NCR_LEVEL[ncr.nullNCR] ?? NCR_LEVEL.remove;
  const clampedNull = Math.max(nullLevel, NCR_LEVEL.remove);
  return { xmlVersion, onLevel, nullLevel: clampedNull };
}
var EntityDecoder = class {
  /**
   * @param {object} [options]
   * @param {object|null}  [options.namedEntities]        — extra named entities merged into base map
   * @param {object}  [options.limit]                 — security limits
   * @param {number}       [options.limit.maxTotalExpansions=0]  — 0 = unlimited
   * @param {number}       [options.limit.maxExpandedLength=0]   — 0 = unlimited
   * @param {'external'|'base'|'all'|string[]} [options.limit.applyLimitsTo='external']
   *   Which entity tiers count against the security limits:
   *   - 'external' (default) — only input/runtime + persistent external entities
   *   - 'base'               — only DEFAULT_XML_ENTITIES + namedEntities
   *   - 'all'                — every entity regardless of tier
   *   - string[]             — explicit combination, e.g. ['external', 'base']
   * @param {((resolved: string, original: string) => string)|null} [options.postCheck=null]
   * @param {string[]} [options.remove=[]] — entity names (e.g. ['nbsp', '#13']) to delete (replace with empty string)
   * @param {string[]} [options.leave=[]]  — entity names to keep as literal (unchanged in output)
   * @param {object}   [options.ncr]       — Numeric Character Reference controls
   * @param {1.0|1.1}  [options.ncr.xmlVersion=1.0]
   *   XML version governing which codepoint ranges are restricted:
   *   - 1.0 — C0 controls U+0001–U+001F (except U+0009/000A/000D) are prohibited
   *   - 1.1 — C0 controls are allowed when written as NCRs; C1 (U+007F–U+009F) decoded as-is
   * @param {'allow'|'leave'|'remove'|'throw'} [options.ncr.onNCR='allow']
   *   Base action for numeric references. Severity order: allow < leave < remove < throw.
   *   For codepoint ranges that carry a minimum level (surrogates → remove, XML 1.0 C0 → remove),
   *   the effective action is max(onNCR, rangeMinimum).
   * @param {'remove'|'throw'} [options.ncr.nullNCR='remove']
   *   Action for U+0000 (null). 'allow' and 'leave' are clamped to 'remove' since null is never safe.
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onExternalEntity=null]
   *   Hook called when an external entity is registered via `setExternalEntities()` or
   *   `addExternalEntity()`. Return `ENTITY_ACTION.ALLOW` to accept the entity,
   *   `ENTITY_ACTION.BLOCK` to silently skip it, or `ENTITY_ACTION.THROW` to abort with an error.
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onInputEntity=null]
   *   Hook called when an input entity is registered via `addInputEntities()`. Return
   *   `ENTITY_ACTION.ALLOW` to accept, `ENTITY_ACTION.BLOCK` to silently skip, or
   *   `ENTITY_ACTION.THROW` to abort with an error.
   */
  constructor(options = {}) {
    this._limit = options.limit || {};
    this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
    this._maxExpandedLength = this._limit.maxExpandedLength || 0;
    this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
    this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
    this._numericAllowed = options.numericAllowed ?? true;
    this._baseMap = mergeEntityMaps(XML, options.namedEntities || null);
    this._externalMap = /* @__PURE__ */ Object.create(null);
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
    this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
    const ncrCfg = parseNCRConfig(options.ncr);
    this._ncrXmlVersion = ncrCfg.xmlVersion;
    this._ncrOnLevel = ncrCfg.onLevel;
    this._ncrNullLevel = ncrCfg.nullLevel;
    this._onExternalEntity = typeof options.onExternalEntity === "function" ? options.onExternalEntity : null;
    this._onInputEntity = typeof options.onInputEntity === "function" ? options.onInputEntity : null;
  }
  // -------------------------------------------------------------------------
  // Private: registration hook dispatch
  // -------------------------------------------------------------------------
  /**
   * Invoke a registration hook for a single entity name/value pair.
   * Returns true when the entity should be accepted, false when it should be
   * silently skipped (BLOCK), and throws when the hook returns THROW.
   *
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} hook
   * @param {string} name
   * @param {string} value
   * @param {string} context  — used in error messages ('external' | 'input')
   * @returns {boolean}  true = accept, false = skip
   */
  _applyRegistrationHook(hook, name, value, context) {
    if (!hook) return true;
    const action = hook(name, value);
    if (action === ENTITY_ACTION.BLOCK) return false;
    if (action === ENTITY_ACTION.THROW) {
      throw new Error(
        `[EntityDecoder] Registration of ${context} entity "&${name};" was rejected by hook`
      );
    }
    return true;
  }
  // -------------------------------------------------------------------------
  // Persistent external entity registration
  // -------------------------------------------------------------------------
  /**
   * Replace the full set of persistent external entities.
   * All keys are validated — throws on invalid characters.
   * If `onExternalEntity` is set, it is called once per entry; entries that
   * return `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW`
   * aborts the whole call.
   * @param {Record<string, string | { regex?: RegExp, val: string }>} map
   */
  setExternalEntities(map) {
    if (map) {
      for (const key of Object.keys(map)) {
        validateEntityName(key);
      }
    }
    if (!this._onExternalEntity) {
      this._externalMap = mergeEntityMaps(map);
      return;
    }
    const flat = mergeEntityMaps(map);
    const filtered = /* @__PURE__ */ Object.create(null);
    for (const [name, value] of Object.entries(flat)) {
      if (this._applyRegistrationHook(this._onExternalEntity, name, value, "external")) {
        filtered[name] = value;
      }
    }
    this._externalMap = filtered;
  }
  /**
   * Add a single persistent external entity.
   * If `onExternalEntity` is set it is called before the entity is stored;
   * `ENTITY_ACTION.BLOCK` silently skips storage, `ENTITY_ACTION.THROW` raises.
   * @param {string} key
   * @param {string} value
   */
  addExternalEntity(key, value) {
    validateEntityName(key);
    if (typeof value === "string" && value.indexOf("&") === -1) {
      if (this._applyRegistrationHook(this._onExternalEntity, key, value, "external")) {
        this._externalMap[key] = value;
      }
    }
  }
  // -------------------------------------------------------------------------
  // Input / runtime entity registration (per document)
  // -------------------------------------------------------------------------
  /**
   * Inject DOCTYPE entities for the current document.
   * Also resets per-document expansion counters.
   * If `onInputEntity` is set it is called once per entry; entries returning
   * `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW` aborts.
   * @param {Record<string, string | { regx?: RegExp, regex?: RegExp, val: string }>} map
   */
  addInputEntities(map) {
    this._totalExpansions = 0;
    this._expandedLength = 0;
    if (!this._onInputEntity) {
      this._inputMap = mergeEntityMaps(map);
      return;
    }
    const flat = mergeEntityMaps(map);
    const filtered = /* @__PURE__ */ Object.create(null);
    for (const [name, value] of Object.entries(flat)) {
      if (this._applyRegistrationHook(this._onInputEntity, name, value, "input")) {
        filtered[name] = value;
      }
    }
    this._inputMap = filtered;
  }
  // -------------------------------------------------------------------------
  // Per-document reset
  // -------------------------------------------------------------------------
  /**
   * Wipe input/runtime entities and reset counters.
   * Call this before processing each new document.
   * @returns {this}
   */
  reset() {
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    return this;
  }
  // -------------------------------------------------------------------------
  // XML version (can be set after construction, e.g. once parser reads <?xml?>)
  // -------------------------------------------------------------------------
  /**
   * Update the XML version used for NCR classification.
   * Call this as soon as the document's `<?xml version="...">` declaration is parsed.
   * @param {1.0|1.1|number} version
   */
  setXmlVersion(version) {
    this._ncrXmlVersion = version === 1.1 ? 1.1 : 1;
  }
  // -------------------------------------------------------------------------
  // Primary API
  // -------------------------------------------------------------------------
  /**
   * Replace all entity references in `str` in a single pass.
   *
   * @param {string} str
   * @returns {string}
   */
  decode(str) {
    if (typeof str !== "string" || str.length === 0) return str;
    if (str.indexOf("&") === -1) return str;
    const original = str;
    const chunks = [];
    const len = str.length;
    let last = 0;
    let i = 0;
    const limitExpansions = this._maxTotalExpansions > 0;
    const limitLength = this._maxExpandedLength > 0;
    const checkLimits = limitExpansions || limitLength;
    while (i < len) {
      if (str.charCodeAt(i) !== 38) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < len && str.charCodeAt(j) !== 59 && j - i <= 32) j++;
      if (j >= len || str.charCodeAt(j) !== 59) {
        i++;
        continue;
      }
      const token = str.slice(i + 1, j);
      if (token.length === 0) {
        i++;
        continue;
      }
      let replacement;
      let tier;
      if (this._removeSet.has(token)) {
        replacement = "";
        if (tier === void 0) {
          tier = LIMIT_TIER_EXTERNAL;
        }
      } else if (this._leaveSet.has(token)) {
        i++;
        continue;
      } else if (token.charCodeAt(0) === 35) {
        const ncrResult = this._resolveNCR(token);
        if (ncrResult === void 0) {
          i++;
          continue;
        }
        replacement = ncrResult;
        tier = LIMIT_TIER_BASE;
      } else {
        const resolved = this._resolveName(token);
        replacement = resolved?.value;
        tier = resolved?.tier;
      }
      if (replacement === void 0) {
        i++;
        continue;
      }
      if (i > last) chunks.push(str.slice(last, i));
      chunks.push(replacement);
      last = j + 1;
      i = last;
      if (checkLimits && this._tierCounts(tier)) {
        if (limitExpansions) {
          this._totalExpansions++;
          if (this._totalExpansions > this._maxTotalExpansions) {
            throw new Error(
              `[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`
            );
          }
        }
        if (limitLength) {
          const delta = replacement.length - (token.length + 2);
          if (delta > 0) {
            this._expandedLength += delta;
            if (this._expandedLength > this._maxExpandedLength) {
              throw new Error(
                `[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`
              );
            }
          }
        }
      }
    }
    if (last < len) chunks.push(str.slice(last));
    const result = chunks.length === 0 ? str : chunks.join("");
    return this._postCheck(result, original);
  }
  // -------------------------------------------------------------------------
  // Private: limit tier check
  // -------------------------------------------------------------------------
  /**
   * Returns true if a resolved entity of the given tier should count
   * against the expansion/length limits.
   * @param {string} tier  — LIMIT_TIER_EXTERNAL | LIMIT_TIER_BASE
   * @returns {boolean}
   */
  _tierCounts(tier) {
    if (this._limitTiers.has(LIMIT_TIER_ALL)) return true;
    return this._limitTiers.has(tier);
  }
  // -------------------------------------------------------------------------
  // Private: entity resolution
  // -------------------------------------------------------------------------
  /**
   * Resolve a named entity token (without & and ;).
   * Priority: inputMap > externalMap > baseMap
   * Returns the resolved value tagged with its limit tier.
   *
   * @param {string} name
   * @returns {{ value: string, tier: string }|undefined}
   */
  _resolveName(name) {
    if (name in this._inputMap) return { value: this._inputMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._externalMap) return { value: this._externalMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._baseMap) return { value: this._baseMap[name], tier: LIMIT_TIER_BASE };
    return void 0;
  }
  /**
   * Classify a codepoint and return the minimum action level that must be applied.
   * Returns -1 when no minimum is imposed (normal allow path).
   *
   * Ranges checked (in priority order):
   *   1. U+0000            — null, governed by nullNCR (always ≥ remove)
   *   2. U+D800–U+DFFF     — surrogates, always prohibited (min: remove)
   *   3. U+0001–U+001F \ {0x09,0x0A,0x0D}  — XML 1.0 restricted C0 (min: remove)
   *      (skipped in XML 1.1 — C0 controls are allowed when written as NCRs)
   *
   * @param {number} cp  — codepoint
   * @returns {number}   — minimum NCR_LEVEL value, or -1 for no restriction
   */
  _classifyNCR(cp) {
    if (cp === 0) return this._ncrNullLevel;
    if (cp >= 55296 && cp <= 57343) return NCR_LEVEL.remove;
    if (this._ncrXmlVersion === 1) {
      if (cp >= 1 && cp <= 31 && !XML10_ALLOWED_C0.has(cp)) return NCR_LEVEL.remove;
    }
    return -1;
  }
  /**
   * Execute a resolved NCR action.
   *
   * @param {number} action   — NCR_LEVEL value
   * @param {string} token    — raw token (e.g. '#38') for error messages
   * @param {number} cp       — codepoint, used only for error messages
   * @returns {string|undefined}
   *   - decoded character string  → 'allow'
   *   - ''                        → 'remove'
   *   - undefined                 → 'leave' (caller must skip past '&' only)
   *   - throws Error              → 'throw'
   */
  _applyNCRAction(action, token, cp) {
    switch (action) {
      case NCR_LEVEL.allow:
        return String.fromCodePoint(cp);
      case NCR_LEVEL.remove:
        return "";
      case NCR_LEVEL.leave:
        return void 0;
      // signal: keep literal
      case NCR_LEVEL.throw:
        throw new Error(
          `[EntityDecoder] Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`
        );
      default:
        return String.fromCodePoint(cp);
    }
  }
  /**
   * Full NCR resolution pipeline for a numeric token.
   *
   * Steps:
   *   1. Parse the codepoint (decimal or hex).
   *   2. Validate the raw codepoint range (NaN, <0, >0x10FFFF).
   *   3. If numericAllowed is false and no minimum restriction applies → leave as-is.
   *   4. Classify the codepoint to find the minimum required action level.
   *   5. Resolve effective action = max(onNCR, minimum).
   *   6. Apply and return.
   *
   * @param {string} token  — e.g. '#38', '#x26', '#X26'
   * @returns {string|undefined}
   *   - string (incl. '')  — replacement ('' = remove)
   *   - undefined          — leave original &token; as-is
   */
  _resolveNCR(token) {
    const second = token.charCodeAt(1);
    let cp;
    if (second === 120 || second === 88) {
      cp = parseInt(token.slice(2), 16);
    } else {
      cp = parseInt(token.slice(1), 10);
    }
    if (Number.isNaN(cp) || cp < 0 || cp > 1114111) return void 0;
    const minimum = this._classifyNCR(cp);
    if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return void 0;
    const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
    return this._applyNCRAction(effective, token, cp);
  }
};

// node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};
var defaultOptions2 = {
  preserveOrder: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  ignoreAttributes: true,
  removeNSPrefix: false,
  // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true,
    unicode: false
  },
  tagValueProcessor: function(tagName, val) {
    return val;
  },
  attributeValueProcessor: function(attrName, val) {
    return val;
  },
  stopNodes: [],
  //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  entityDecoder: null,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function(tagName, jPath, attrs2) {
    return tagName;
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true,
  // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== "string") {
    return;
  }
  const normalized = propertyName.toLowerCase();
  if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
  if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
}
function normalizeProcessEntities(value, htmlEntities) {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      // true or false
      maxEntitySize: 1e4,
      maxExpansionDepth: 1e4,
      maxTotalExpansions: Infinity,
      maxExpandedLength: 1e5,
      maxEntityCount: 1e3,
      allowedTags: null,
      tagFilter: null,
      appliesTo: "all"
    };
  }
  if (typeof value === "object" && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
      maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
      maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
      maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
      maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null,
      appliesTo: value.appliesTo ?? "all"
    };
  }
  return normalizeProcessEntities(true);
}
var buildOptions = function(options) {
  const built = Object.assign({}, defaultOptions2, options);
  const propertyNameOptions = [
    { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
    { value: built.attributesGroupName, name: "attributesGroupName" },
    { value: built.textNodeName, name: "textNodeName" },
    { value: built.cdataPropName, name: "cdataPropName" },
    { value: built.commentPropName, name: "commentPropName" }
  ];
  for (const { value, name } of propertyNameOptions) {
    if (value) {
      validatePropertyName(value, name);
    }
  }
  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }
  built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);
  built.unpairedTagsSet = new Set(built.unpairedTags);
  if (built.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map((node) => {
      if (typeof node === "string" && node.startsWith("*.")) {
        return ".." + node.substring(2);
      }
      return node;
    });
  }
  return built;
};

// node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var METADATA_SYMBOL;
if (typeof Symbol !== "function") {
  METADATA_SYMBOL = "@@xmlMetadata";
} else {
  METADATA_SYMBOL = Symbol("XML Node Metadata");
}
var XmlNode = class {
  constructor(tagname) {
    this.tagname = tagname;
    this.child = [];
    this[":@"] = /* @__PURE__ */ Object.create(null);
  }
  add(key, val) {
    if (key === "__proto__") key = "#__proto__";
    this.child.push({ [key]: val });
  }
  addChild(node, startIndex) {
    if (node.tagname === "__proto__") node.tagname = "#__proto__";
    if (node[":@"] && Object.keys(node[":@"]).length > 0) {
      this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
    } else {
      this.child.push({ [node.tagname]: node.child });
    }
    this.addStartIndex(startIndex);
  }
  addStartIndex(startIndex) {
    if (startIndex !== void 0) {
      this.child[this.child.length - 1][METADATA_SYMBOL] = { startIndex };
    }
  }
  addEndIndex(endIndex) {
    const lastChild = this.child[this.child.length - 1];
    if (lastChild !== void 0 && lastChild[METADATA_SYMBOL] !== void 0 && lastChild[METADATA_SYMBOL].endIndex === void 0) {
      lastChild[METADATA_SYMBOL].endIndex = endIndex;
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL;
  }
};

// node_modules/xml-naming/src/index.js
var nameStartChar10 = ":A-Za-z_\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
var nameChar10 = nameStartChar10 + "\\-\\.\\d\xB7\u0300-\u036F\u203F-\u2040";
var nameStartChar11 = ":A-Za-z_\xC0-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
var nameChar11 = nameStartChar11 + "\\-\\.\\d\xB7\u0300-\u036F\u0487\u203F-\u2040";
var buildRegexes = (startChar, char, flags = "") => {
  const ncStart = startChar.replace(":", "");
  const ncChar = char.replace(":", "");
  const ncNamePat = `[${ncStart}][${ncChar}]*`;
  return {
    name: new RegExp(`^[${startChar}][${char}]*$`, flags),
    ncName: new RegExp(`^${ncNamePat}$`, flags),
    qName: new RegExp(`^${ncNamePat}(?::${ncNamePat})?$`, flags),
    nmToken: new RegExp(`^[${char}]+$`, flags),
    nmTokens: new RegExp(`^[${char}]+(?:\\s+[${char}]+)*$`, flags)
  };
};
var regexes10 = buildRegexes(nameStartChar10, nameChar10);
var regexes11 = buildRegexes(nameStartChar11, nameChar11, "u");
var nameStartCharAscii = ":A-Za-z_";
var nameCharAscii = nameStartCharAscii + "\\-\\.\\d";
var regexesAscii = buildRegexes(nameStartCharAscii, nameCharAscii);
var getRegexes = (xmlVersion = "1.0", asciiOnly = false) => {
  if (asciiOnly) return regexesAscii;
  return xmlVersion === "1.1" ? regexes11 : regexes10;
};
var qName = (str, { xmlVersion = "1.0", asciiOnly = false } = {}) => getRegexes(xmlVersion, asciiOnly).qName.test(str);

// node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
  constructor(options, xmlVersion) {
    this.suppressValidationErr = !options;
    this.options = options;
    this.xmlVersion = xmlVersion || 1;
  }
  setXmlVersion(xmlVersion = 1) {
    this.xmlVersion = xmlVersion;
  }
  readDocType(xmlData, i) {
    const entities = /* @__PURE__ */ Object.create(null);
    let entityCount = 0;
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let quoteChar = null;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (quoteChar !== null) {
          if (xmlData[i] === quoteChar) quoteChar = null;
          exp += xmlData[i];
          continue;
        }
        if (!hasBody && !comment && (xmlData[i] === '"' || xmlData[i] === "'")) {
          quoteChar = xmlData[i];
          exp += xmlData[i];
          continue;
        }
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
            if (val.indexOf("&") === -1) {
              if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                throw new Error(
                  `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                );
              }
              entities[entityName] = val;
              entityCount++;
            }
          } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
            i += 8;
            const { index } = this.readElementExp(xmlData, i + 1);
            i = index;
          } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
            i += 8;
          } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
            i += 9;
            const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
            i = index;
          } else if (hasSeq(xmlData, "!--", i)) comment = true;
          else throw new Error(`Invalid DOCTYPE`);
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (quoteChar !== null || angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  readEntityExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
      i++;
    }
    let entityName = xmlData.substring(startIndex, i);
    validateEntityName2(entityName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    if (!this.suppressValidationErr) {
      if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
      } else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
      }
    }
    let entityValue = "";
    [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
    if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
      throw new Error(
        `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
      );
    }
    i--;
    return [entityName, entityValue, i];
  }
  readNotationExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let notationName = xmlData.substring(startIndex, i);
    !this.suppressValidationErr && validateEntityName2(notationName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
      throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;
    i = skipWhitespace(xmlData, i);
    let publicIdentifier = null;
    let systemIdentifier = null;
    if (identifierType === "PUBLIC") {
      [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] === '"' || xmlData[i] === "'") {
        [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      }
    } else if (identifierType === "SYSTEM") {
      [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      if (!this.suppressValidationErr && !systemIdentifier) {
        throw new Error("Missing mandatory system identifier for SYSTEM notation");
      }
    }
    return { notationName, publicIdentifier, systemIdentifier, index: --i };
  }
  readIdentifierVal(xmlData, i, type) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
      throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;
    const startIndex = i;
    while (i < xmlData.length && xmlData[i] !== startChar) {
      i++;
    }
    identifierVal = xmlData.substring(startIndex, i);
    if (xmlData[i] !== startChar) {
      throw new Error(`Unterminated ${type} value`);
    }
    i++;
    return [i, identifierVal];
  }
  readElementExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    if (!this.suppressValidationErr && !qName(elementName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid element name: "${elementName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
    else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
    else if (xmlData[i] === "(") {
      i++;
      const startIndex2 = i;
      while (i < xmlData.length && xmlData[i] !== ")") {
        i++;
      }
      contentModel = xmlData.substring(startIndex2, i);
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated content model");
      }
    } else if (!this.suppressValidationErr) {
      throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    return {
      elementName,
      contentModel: contentModel.trim(),
      index: i
    };
  }
  readAttlistExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    let startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    validateEntityName2(elementName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let attributeName = xmlData.substring(startIndex, i);
    if (!validateEntityName2(attributeName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid attribute name: "${attributeName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let attributeType = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
      attributeType = "NOTATION";
      i += 8;
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] !== "(") {
        throw new Error(`Expected '(', found "${xmlData[i]}"`);
      }
      i++;
      let allowedNotations = [];
      while (i < xmlData.length && xmlData[i] !== ")") {
        const startIndex2 = i;
        while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
          i++;
        }
        let notation = xmlData.substring(startIndex2, i);
        notation = notation.trim();
        if (!validateEntityName2(notation, { xmlVersion: this.xmlVersion })) {
          throw new Error(`Invalid notation name: "${notation}"`);
        }
        allowedNotations.push(notation);
        if (xmlData[i] === "|") {
          i++;
          i = skipWhitespace(xmlData, i);
        }
      }
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated list of notations");
      }
      i++;
      attributeType += " (" + allowedNotations.join("|") + ")";
    } else {
      const startIndex2 = i;
      while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        i++;
      }
      attributeType += xmlData.substring(startIndex2, i);
      const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
        throw new Error(`Invalid attribute type: "${attributeType}"`);
      }
    }
    i = skipWhitespace(xmlData, i);
    let defaultValue = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
      defaultValue = "#REQUIRED";
      i += 8;
    } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
      defaultValue = "#IMPLIED";
      i += 7;
    } else {
      [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
    }
    return {
      elementName,
      attributeName,
      attributeType,
      defaultValue,
      index: i
    };
  }
};
var skipWhitespace = (data, index) => {
  while (index < data.length && /\s/.test(data[index])) {
    index++;
  }
  return index;
};
function hasSeq(data, seq, i) {
  for (let j = 0; j < seq.length; j++) {
    if (seq[j] !== data[i + j + 1]) return false;
  }
  return true;
}
function validateEntityName2(name, xmlVersion) {
  if (qName(name, { xmlVersion }))
    return name;
  else
    throw new Error(`Invalid entity name ${name}`);
}

// node_modules/anynum/digitTable.js
var SCRIPT_ZEROS = [
  // Basic Latin (ASCII) — included for completeness / pass-through
  48,
  // 0-9
  // Arabic scripts
  1632,
  // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
  1776,
  // Extended Arabic-Indic (Urdu/Persian/Sindhi) ۰۱۲۳
  // Indic scripts
  2406,
  // Devanagari ०१२३४५६७८९
  2534,
  // Bengali ০১২৩৪৫৬৭৮৯
  2662,
  // Gurmukhi ੦੧੨੩੪੫੬੭੮੯
  2790,
  // Gujarati ૦૧૨૩૪૫૬૭૮૯
  2918,
  // Odia ୦୧୨୩୪୫୬୭୮୯
  3046,
  // Tamil ௦௧௨௩௪௫௬௭௮௯
  3174,
  // Telugu ౦౧౨౩౪౫౬౭౮౯
  3302,
  // Kannada ೦೧೨೩೪೫೬೭೮೯
  3430,
  // Malayalam ൦൧൨൩൪൫൬൭൮൯
  3558,
  // Sinhala Archaic ෦෧෨෩෪෫෬෭෮෯
  // Southeast Asian scripts
  3664,
  // Thai ๐๑๒๓๔๕๖๗๘๙
  3792,
  // Lao ໐໑໒໓໔໕໖໗໘໙
  3872,
  // Tibetan ༠༡༢༣༤༥༦༧༨༩
  4160,
  // Myanmar ၀၁၂၃၄၅၆၇၈၉
  4240,
  // Myanmar Shan ႐႑႒႓႔႕႖႗႘႙
  6112,
  // Khmer ០១២៣៤៥៦៧៨៩
  6160,
  // Mongolian ᠐᠑᠒᠓᠔᠕᠖᠗᠘᠙
  6470,
  // Limbu ᥆᥇᥈᥉᥊᥋᥌᥍᥎᥏
  6608,
  // New Tai Lue ᧐᧑᧒᧓᧔᧕᧖᧗᧘᧙
  6784,
  // Tai Tham Hora ᪀᪁᪂᪃᪄᪅᪆᪇᪈᪉
  6800,
  // Tai Tham Tham ᪐᪑᪒᪓᪔᪕᪖᪗᪘᪙
  6992,
  // Balinese ᭐᭑᭒᭓᭔᭕᭖᭗᭘᭙
  7088,
  // Sundanese ᮰᮱᮲᮳᮴᮵᮶᮷᮸᮹
  7232,
  // Lepcha ᱀᱁᱂᱃᱄᱅᱆᱇᱈᱉
  7248,
  // Ol Chiki ᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙
  // Fullwidth (CJK context)
  65296,
  // Fullwidth ０１２３４５６７８９
  // Mathematical digit variants (Unicode math block)
  120782,
  // Mathematical Bold
  120792,
  // Mathematical Double-Struck
  120802,
  // Mathematical Sans-Serif
  120812,
  // Mathematical Sans-Serif Bold
  120822,
  // Mathematical Monospace
  // Other scripts
  66720,
  // Osmanya 𐒠𐒡𐒢𐒣𐒤𐒥𐒦𐒧𐒨𐒩
  68912,
  // Hanifi Rohingya 𐴰𐴱𐴲𐴳𐴴𐴵𐴶𐴷𐴸𐴹
  69734,
  // Brahmi 𑁦𑁧𑁨𑁩𑁪𑁫𑁬𑁭𑁮𑁯
  69872,
  // Sora Sompeng 𑃰𑃱𑃲𑃳𑃴𑃵𑃶𑃷𑃸𑃹
  69942,
  // Chakma 𑄶𑄷𑄸𑄹𑄺𑄻𑄼𑄽𑄾𑄿
  70096,
  // Sharada 𑇐𑇑𑇒𑇓𑇔𑇕𑇖𑇗𑇘𑇙
  70384,
  // Khudawadi 𑋰𑋱𑋲𑋳𑋴𑋵𑋶𑋷𑋸𑋹
  70736,
  // Newa 𑑐𑑑𑑒𑑓𑑔𑑕𑑖𑑗𑑘𑑙
  70864,
  // Tirhuta 𑓐𑓑𑓒𑓓𑓔𑓕𑓖𑓗𑓘𑓙
  71248,
  // Modi 𑙐𑙑𑙒𑙓𑙔𑙕𑙖𑙗𑙘𑙙
  71360,
  // Takri 𑛀𑛁𑛂𑛃𑛄𑛅𑛆𑛇𑛈𑛉
  71472,
  // Ahom 𑜰𑜱𑜲𑜳𑜴𑜵𑜶𑜷𑜸𑜹
  71904,
  // Warang Citi 𑣠𑣡𑣢𑣣𑣤𑣥𑣦𑣧𑣨𑣩
  72016,
  // Dives Akuru 𑥐𑥑𑥒𑥓𑥔𑥕𑥖𑥗𑥘𑥙
  72688,
  // Khitan Small Script 𑯰𑯱𑯲𑯳𑯴𑯵𑯶𑯷𑯸𑯹
  72784,
  // Bhaiksuki 𑱐𑱑𑱒𑱓𑱔𑱕𑱖𑱗𑱘𑱙
  73040,
  // Masaram Gondi 𑵐𑵑𑵒𑵓𑵔𑵕𑵖𑵗𑵘𑵙
  73120,
  // Gunjala Gondi 𑶠𑶡𑶢𑶣𑶤𑶥𑶦𑶧𑶨𑶩
  73552,
  // Kawi 𑽐𑽑𑽒𑽓𑽔𑽕𑽖𑽗𑽘𑽙
  92768,
  // Mro 𖩠𖩡𖩢𖩣𖩤𖩥𖩦𖩧𖩨𖩩
  92864,
  // Tangsa 𖫀𖫁𖫂𖫃𖫄𖫅𖫆𖫇𖫈𖫉
  93008,
  // Pahawh Hmong 𖭐𖭑𖭒𖭓𖭔𖭕𖭖𖭗𖭘𖭙
  123200,
  // Nyiakeng Puachue Hmong 𞅀𞅁𞅂𞅃𞅄𞅅𞅆𞅇𞅈𞅉
  123632,
  // Wancho 𞋰𞋱𞋲𞋳𞋴𞋵𞋶𞋷𞋸𞋹
  124144,
  // Nag Mundari 𞓰𞓱𞓲𞓳𞓴𞓵𞓶𞓷𞓸𞓹
  125264,
  // Adlam 𞥐𞥑𞥒𞥓𞥔𞥕𞥖𞥗𞥘𞥙
  130032
  // Segmented digit symbols 🯰🯱🯲🯳🯴🯵🯶🯷🯸🯹
];
var NOT_DIGIT = 255;
var HIGH_MAP = /* @__PURE__ */ new Map();
var LOW_MAX = 65535;
var LOW_MIN = 1632;
var TABLE_OFFSET = LOW_MIN;
var TABLE_SIZE = LOW_MAX - LOW_MIN + 1;
var TABLE = new Uint8Array(TABLE_SIZE).fill(NOT_DIGIT);
for (const zero of SCRIPT_ZEROS) {
  for (let d = 0; d < 10; d++) {
    const cp = zero + d;
    if (cp <= LOW_MAX) {
      TABLE[cp - TABLE_OFFSET] = d;
    } else {
      HIGH_MAP.set(cp, d);
    }
  }
}

// node_modules/anynum/anynum.js
var CHAR_0 = 48;
var CHAR_9 = 57;
var CHAR_MINUS = 45;
var MINUS_SET = /* @__PURE__ */ new Set([8722, 65293, 65123]);
function anynum(str) {
  if (typeof str !== "string") return str;
  const len = str.length;
  if (len === 0) return str;
  let firstHit = -1;
  for (let i = 0; i < len; i++) {
    const cc = str.charCodeAt(i);
    if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) continue;
    if (cc < TABLE_OFFSET) {
      if (MINUS_SET.has(cc)) {
        firstHit = i;
        break;
      }
      continue;
    }
    if (cc >= 55296 && cc <= 56319) {
      if (i + 1 < len) {
        const low = str.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
          if (HIGH_MAP.has(cp)) {
            firstHit = i;
            break;
          }
        }
      }
      continue;
    }
    if (TABLE[cc - TABLE_OFFSET] !== NOT_DIGIT || MINUS_SET.has(cc)) {
      firstHit = i;
      break;
    }
  }
  if (firstHit === -1) return str;
  const chars = [];
  if (firstHit > 0) chars.push(str.slice(0, firstHit));
  for (let i = firstHit; i < len; i++) {
    const cc = str.charCodeAt(i);
    if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) {
      chars.push(str[i]);
      continue;
    }
    if (cc < TABLE_OFFSET) {
      chars.push(MINUS_SET.has(cc) ? "-" : str[i]);
      continue;
    }
    if (cc >= 55296 && cc <= 56319) {
      if (i + 1 < len) {
        const low = str.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
          const d2 = HIGH_MAP.get(cp);
          if (d2 !== void 0) {
            chars.push(String.fromCharCode(d2 + 48));
            i++;
            continue;
          }
        }
      }
      chars.push(str[i]);
      continue;
    }
    if (MINUS_SET.has(cc)) {
      chars.push("-");
      continue;
    }
    const d = TABLE[cc - TABLE_OFFSET];
    chars.push(d !== NOT_DIGIT ? String.fromCharCode(d + 48) : str[i]);
  }
  return chars.join("");
}
var anynum_default = anynum;

// node_modules/strnum/strnum.js
var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
var binRegex = /^0b[01]+$/;
var octRegex = /^0o[0-7]+$/;
var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
var consider = {
  hex: true,
  binary: false,
  octal: false,
  leadingZeros: true,
  decimalPoint: ".",
  eNotation: true,
  //skipLike: /regex/,
  infinity: "original",
  // "null", "infinity" (Infinity type), "string" ("Infinity" (the string literal))
  unicode: false
};
function toNumber(str, options = {}) {
  options = Object.assign({}, consider, options);
  if (!str || typeof str !== "string") return str;
  let trimmedStr = str.trim();
  if (trimmedStr.length === 0) return str;
  else if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
  else if (trimmedStr === "0") return 0;
  if (options.unicode) {
    trimmedStr = anynum_default(trimmedStr);
    if (trimmedStr === "0") return 0;
  }
  if (options.hex && hexRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 16);
  } else if (options.binary && binRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 2);
  } else if (options.octal && octRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 8);
  } else if (!isFinite(trimmedStr)) {
    const num = Number(trimmedStr);
    if (Number.isNaN(num)) return str;
    return handleInfinity(str, num, options);
  } else if (trimmedStr.includes("e") || trimmedStr.includes("E")) {
    return resolveEnotation(str, trimmedStr, options);
  } else {
    const match = numRegex.exec(trimmedStr);
    if (match) {
      const sign = match[1] || "";
      const leadingZeros = match[2];
      let numTrimmedByZeros = trimZeros(match[3]);
      const decimalAdjacentToLeadingZeros = sign ? (
        // 0., -00., 000.
        trimmedStr[leadingZeros.length + 1] === "."
      ) : trimmedStr[leadingZeros.length] === ".";
      if (!options.leadingZeros && (leadingZeros.length > 1 || leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros)) {
        return str;
      } else {
        const num = Number(trimmedStr);
        const parsedStr = String(num);
        if (num === 0) return num;
        if (parsedStr.search(/[eE]/) !== -1) {
          if (options.eNotation) return num;
          else return str;
        } else if (trimmedStr.indexOf(".") !== -1) {
          if (parsedStr === "0") return num;
          else if (parsedStr === numTrimmedByZeros) return num;
          else if (parsedStr === `${sign}${numTrimmedByZeros}`) return num;
          else return str;
        }
        let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
        if (leadingZeros) {
          return n === parsedStr || sign + n === parsedStr ? num : str;
        } else {
          return n === parsedStr || n === sign + parsedStr ? num : str;
        }
      }
    } else {
      return str;
    }
  }
}
var eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str, trimmedStr, options) {
  if (!options.eNotation) return str;
  const notation = trimmedStr.match(eNotationRegx);
  if (notation) {
    let sign = notation[1] || "";
    const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
    const leadingZeros = notation[2];
    const eAdjacentToLeadingZeros = sign ? (
      // 0E.
      trimmedStr[leadingZeros.length + 1] === eChar
    ) : trimmedStr[leadingZeros.length] === eChar;
    if (leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str;
    else if (leadingZeros.length === 1 && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)) {
      return Number(trimmedStr);
    } else if (leadingZeros.length > 0) {
      if (options.leadingZeros && !eAdjacentToLeadingZeros) {
        return Number(trimmedStr);
      } else return str;
    } else {
      return Number(trimmedStr);
    }
  } else {
    return str;
  }
}
function trimZeros(numStr) {
  if (numStr && numStr.indexOf(".") !== -1) {
    let end = numStr.length;
    while (end > 0 && numStr.charCodeAt(end - 1) === 48) end--;
    numStr = numStr.slice(0, end);
    if (numStr === ".") numStr = "0";
    else if (numStr[0] === ".") numStr = "0" + numStr;
    else if (numStr[numStr.length - 1] === ".") numStr = numStr.substring(0, numStr.length - 1);
    return numStr;
  }
  return numStr;
}
function parse_int(numStr, base) {
  const str = numStr.trim();
  if (base === 2 || base === 8) numStr = str.substring(2);
  if (parseInt) return parseInt(numStr, base);
  else if (Number.parseInt) return Number.parseInt(numStr, base);
  else if (window && window.parseInt) return window.parseInt(numStr, base);
  else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
function handleInfinity(str, num, options) {
  const isPositive = num === Infinity;
  switch (options.infinity.toLowerCase()) {
    case "null":
      return null;
    case "infinity":
      return num;
    // Return Infinity or -Infinity
    case "string":
      return isPositive ? "Infinity" : "-Infinity";
    case "original":
    default:
      return str;
  }
}

// node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
  if (typeof ignoreAttributes === "function") {
    return ignoreAttributes;
  }
  if (Array.isArray(ignoreAttributes)) {
    return (attrName) => {
      for (const pattern of ignoreAttributes) {
        if (typeof pattern === "string" && attrName === pattern) {
          return true;
        }
        if (pattern instanceof RegExp && pattern.test(attrName)) {
          return true;
        }
      }
    };
  }
  return () => false;
}

// node_modules/path-expression-matcher/src/Expression.js
var Expression = class {
  /**
   * Create a new Expression
   * @param {string} pattern - Pattern string (e.g., "root.users.user", "..user[id]")
   * @param {Object} options - Configuration options
   * @param {string} options.separator - Path separator (default: '.')
   */
  constructor(pattern, options = {}, data) {
    this.pattern = pattern;
    this.separator = options.separator || ".";
    this.segments = this._parse(pattern);
    this.data = data;
    this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
    this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== void 0);
    this._hasPositionSelector = this.segments.some((seg) => seg.position !== void 0);
  }
  /**
   * Parse pattern string into segments
   * @private
   * @param {string} pattern - Pattern to parse
   * @returns {Array} Array of segment objects
   */
  _parse(pattern) {
    const segments = [];
    let i = 0;
    let currentPart = "";
    while (i < pattern.length) {
      if (pattern[i] === this.separator) {
        if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
            currentPart = "";
          }
          segments.push({ type: "deep-wildcard" });
          i += 2;
        } else {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
          }
          currentPart = "";
          i++;
        }
      } else {
        currentPart += pattern[i];
        i++;
      }
    }
    if (currentPart.trim()) {
      segments.push(this._parseSegment(currentPart.trim()));
    }
    return segments;
  }
  /**
   * Parse a single segment
   * @private
   * @param {string} part - Segment string (e.g., "user", "ns::user", "user[id]", "ns::user:first")
   * @returns {Object} Segment object
   */
  _parseSegment(part) {
    const segment = { type: "tag" };
    let bracketContent = null;
    let withoutBrackets = part;
    const bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
    if (bracketMatch) {
      withoutBrackets = bracketMatch[1] + bracketMatch[3];
      if (bracketMatch[2]) {
        const content = bracketMatch[2].slice(1, -1);
        if (content) {
          bracketContent = content;
        }
      }
    }
    let namespace = void 0;
    let tagAndPosition = withoutBrackets;
    if (withoutBrackets.includes("::")) {
      const nsIndex = withoutBrackets.indexOf("::");
      namespace = withoutBrackets.substring(0, nsIndex).trim();
      tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
      if (!namespace) {
        throw new Error(`Invalid namespace in pattern: ${part}`);
      }
    }
    let tag = void 0;
    let positionMatch = null;
    if (tagAndPosition.includes(":")) {
      const colonIndex = tagAndPosition.lastIndexOf(":");
      const tagPart = tagAndPosition.substring(0, colonIndex).trim();
      const posPart = tagAndPosition.substring(colonIndex + 1).trim();
      const isPositionKeyword = ["first", "last", "odd", "even"].includes(posPart) || /^nth\(\d+\)$/.test(posPart);
      if (isPositionKeyword) {
        tag = tagPart;
        positionMatch = posPart;
      } else {
        tag = tagAndPosition;
      }
    } else {
      tag = tagAndPosition;
    }
    if (!tag) {
      throw new Error(`Invalid segment pattern: ${part}`);
    }
    segment.tag = tag;
    if (namespace) {
      segment.namespace = namespace;
    }
    if (bracketContent) {
      if (bracketContent.includes("=")) {
        const eqIndex = bracketContent.indexOf("=");
        segment.attrName = bracketContent.substring(0, eqIndex).trim();
        segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
      } else {
        segment.attrName = bracketContent.trim();
      }
    }
    if (positionMatch) {
      const nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
      if (nthMatch) {
        segment.position = "nth";
        segment.positionValue = parseInt(nthMatch[1], 10);
      } else {
        segment.position = positionMatch;
      }
    }
    return segment;
  }
  /**
   * Get the number of segments
   * @returns {number}
   */
  get length() {
    return this.segments.length;
  }
  /**
   * Check if expression contains deep wildcard
   * @returns {boolean}
   */
  hasDeepWildcard() {
    return this._hasDeepWildcard;
  }
  /**
   * Check if expression has attribute conditions
   * @returns {boolean}
   */
  hasAttributeCondition() {
    return this._hasAttributeCondition;
  }
  /**
   * Check if expression has position selectors
   * @returns {boolean}
   */
  hasPositionSelector() {
    return this._hasPositionSelector;
  }
  /**
   * Get string representation
   * @returns {string}
   */
  toString() {
    return this.pattern;
  }
};

// node_modules/path-expression-matcher/src/ExpressionSet.js
var ExpressionSet = class {
  constructor() {
    this._byDepthAndTag = /* @__PURE__ */ new Map();
    this._wildcardByDepth = /* @__PURE__ */ new Map();
    this._deepWildcards = [];
    this._deepByTerminalTag = /* @__PURE__ */ new Map();
    this._patterns = /* @__PURE__ */ new Set();
    this._sealed = false;
  }
  /**
   * Add an Expression to the set.
   * Duplicate patterns (same pattern string) are silently ignored.
   *
   * @param {import('./Expression.js').default} expression - A pre-constructed Expression instance
   * @returns {this} for chaining
   * @throws {TypeError} if called after seal()
   *
   * @example
   * set.add(new Expression('root.users.user'));
   * set.add(new Expression('..script'));
   */
  add(expression) {
    if (this._sealed) {
      throw new TypeError(
        "ExpressionSet is sealed. Create a new ExpressionSet to add more expressions."
      );
    }
    if (this._patterns.has(expression.pattern)) return this;
    this._patterns.add(expression.pattern);
    if (expression.hasDeepWildcard()) {
      const lastSeg2 = expression.segments[expression.segments.length - 1];
      if (lastSeg2 && lastSeg2.type !== "deep-wildcard" && lastSeg2.tag !== "*") {
        const tag2 = lastSeg2.tag;
        if (!this._deepByTerminalTag.has(tag2)) this._deepByTerminalTag.set(tag2, []);
        this._deepByTerminalTag.get(tag2).push(expression);
      } else {
        this._deepWildcards.push(expression);
      }
      return this;
    }
    const depth = expression.length;
    const lastSeg = expression.segments[expression.segments.length - 1];
    const tag = lastSeg?.tag;
    if (!tag || tag === "*") {
      if (!this._wildcardByDepth.has(depth)) this._wildcardByDepth.set(depth, []);
      this._wildcardByDepth.get(depth).push(expression);
    } else {
      const key = `${depth}:${tag}`;
      if (!this._byDepthAndTag.has(key)) this._byDepthAndTag.set(key, []);
      this._byDepthAndTag.get(key).push(expression);
    }
    return this;
  }
  /**
   * Add multiple expressions at once.
   *
   * @param {import('./Expression.js').default[]} expressions - Array of Expression instances
   * @returns {this} for chaining
   *
   * @example
   * set.addAll([
   *   new Expression('root.users.user'),
   *   new Expression('root.config.setting'),
   * ]);
   */
  addAll(expressions) {
    for (const expr of expressions) this.add(expr);
    return this;
  }
  /**
   * Check whether a pattern string is already present in the set.
   *
   * @param {import('./Expression.js').default} expression
   * @returns {boolean}
   */
  has(expression) {
    return this._patterns.has(expression.pattern);
  }
  /**
   * Number of expressions in the set.
   * @type {number}
   */
  get size() {
    return this._patterns.size;
  }
  /**
   * Seal the set against further modifications.
   * Useful to prevent accidental mutations after config is built.
   * Calling add() or addAll() on a sealed set throws a TypeError.
   *
   * @returns {this}
   */
  seal() {
    this._sealed = true;
    return this;
  }
  /**
   * Whether the set has been sealed.
   * @type {boolean}
   */
  get isSealed() {
    return this._sealed;
  }
  /**
   * Test whether the matcher's current path matches any expression in the set.
   *
   * Evaluation order (cheapest → most expensive):
   *  1. Exact depth + tag bucket  — O(1) lookup, typically 0–2 expressions
   *  2. Depth-only wildcard bucket — O(1) lookup, rare
   *  3. Deep-wildcard list         — always checked, but usually small
   *
   * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
   * @returns {boolean} true if any expression matches the current path
   *
   * @example
   * if (stopNodes.matchesAny(matcher)) {
   *   // handle stop node
   * }
   */
  matchesAny(matcher) {
    return this.findMatch(matcher) !== null;
  }
  /**
  * Find and return the first Expression that matches the matcher's current path.
  *
  * Uses the same evaluation order as matchesAny (cheapest → most expensive):
  *  1. Exact depth + tag bucket
  *  2. Depth-only wildcard bucket
  *  3. Deep-wildcard list
  *
  * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
  * @returns {import('./Expression.js').default | null} the first matching Expression, or null
  *
  * @example
  * const expr = stopNodes.findMatch(matcher);
  * if (expr) {
  *   // access expr.config, expr.pattern, etc.
  * }
  */
  findMatch(matcher) {
    const depth = matcher.getDepth();
    const tag = matcher.getCurrentTag();
    const exactKey = `${depth}:${tag}`;
    const exactBucket = this._byDepthAndTag.get(exactKey);
    if (exactBucket) {
      for (let i = 0; i < exactBucket.length; i++) {
        if (matcher.matches(exactBucket[i])) return exactBucket[i];
      }
    }
    const wildcardBucket = this._wildcardByDepth.get(depth);
    if (wildcardBucket) {
      for (let i = 0; i < wildcardBucket.length; i++) {
        if (matcher.matches(wildcardBucket[i])) return wildcardBucket[i];
      }
    }
    const deepBucket = this._deepByTerminalTag.get(tag);
    if (deepBucket) {
      for (let i = 0; i < deepBucket.length; i++) {
        if (matcher.matches(deepBucket[i])) return deepBucket[i];
      }
    }
    for (let i = 0; i < this._deepWildcards.length; i++) {
      if (matcher.matches(this._deepWildcards[i])) return this._deepWildcards[i];
    }
    return null;
  }
};

// node_modules/path-expression-matcher/src/Matcher.js
var MatcherView = class {
  /**
   * @param {Matcher} matcher - The parent Matcher instance to read from.
   */
  constructor(matcher) {
    this._matcher = matcher;
  }
  /**
   * Get the path separator used by the parent matcher.
   * @returns {string}
   */
  get separator() {
    return this._matcher.separator;
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    const path13 = this._matcher.path;
    return path13.length > 0 ? path13[path13.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    const path13 = this._matcher.path;
    return path13.length > 0 ? path13[path13.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    const path13 = this._matcher.path;
    if (path13.length === 0) return void 0;
    return path13[path13.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    const path13 = this._matcher.path;
    if (path13.length === 0) return false;
    const current = path13[path13.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get the value of a "kept" attribute from the nearest ancestor (or
   * current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {*}
   */
  getAnyParentAttr(attrName) {
    return this._matcher.getAnyParentAttr(attrName);
  }
  /**
   * Check whether any ancestor (or the current node) kept the given
   * attribute via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAnyParentAttr(attrName) {
    return this._matcher.hasAnyParentAttr(attrName);
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    const path13 = this._matcher.path;
    if (path13.length === 0) return -1;
    return path13[path13.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    const path13 = this._matcher.path;
    if (path13.length === 0) return -1;
    return path13[path13.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this._matcher.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    return this._matcher.toString(separator, includeNamespace);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this._matcher.path.map((n) => n.tag);
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    return this._matcher.matches(expression);
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this._matcher);
  }
};
var Matcher = class {
  /**
   * Create a new Matcher.
   * @param {Object} [options={}]
   * @param {string} [options.separator='.'] - Default path separator
   */
  constructor(options = {}) {
    this.separator = options.separator || ".";
    this.path = [];
    this.siblingStacks = [];
    this._pathStringCache = null;
    this._view = new MatcherView(this);
    this._keptAttrs = [];
  }
  /**
   * Push a new tag onto the path.
   * @param {string} tagName
   * @param {Object|null} [attrValues=null]
   * @param {string|null} [namespace=null]
   * @param {Object|null} [options=null]
   * @param {string[]} [options.keep] - Names of attributes (from attrValues)
   */
  push(tagName, attrValues = null, namespace = null, options = null) {
    this._pathStringCache = null;
    if (this.path.length > 0) {
      this.path[this.path.length - 1].values = void 0;
    }
    const currentLevel = this.path.length;
    let level = this.siblingStacks[currentLevel];
    if (!level) {
      level = { counts: /* @__PURE__ */ new Map(), total: 0 };
      this.siblingStacks[currentLevel] = level;
    }
    const siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
    const counter = level.counts.get(siblingKey) || 0;
    const position = level.total;
    level.counts.set(siblingKey, counter + 1);
    level.total++;
    const node = {
      tag: tagName,
      position,
      counter
    };
    if (namespace !== null && namespace !== void 0) {
      node.namespace = namespace;
    }
    if (attrValues !== null && attrValues !== void 0) {
      node.values = attrValues;
    }
    this.path.push(node);
    const depth = this.path.length;
    const keep = options !== null ? options.keep : null;
    if (keep !== null && keep !== void 0 && keep.length > 0 && attrValues) {
      for (let i = 0; i < keep.length; i++) {
        const name = keep[i];
        if (attrValues[name] !== void 0) {
          this._keptAttrs.push({ depth, name, value: attrValues[name] });
        }
      }
    }
  }
  /**
   * Pop the last tag from the path.
   * @returns {Object|undefined} The popped node
   */
  pop() {
    if (this.path.length === 0) return void 0;
    this._pathStringCache = null;
    const node = this.path.pop();
    if (this.siblingStacks.length > this.path.length + 1) {
      this.siblingStacks.length = this.path.length + 1;
    }
    const poppedDepth = this.path.length + 1;
    while (this._keptAttrs.length > 0 && this._keptAttrs[this._keptAttrs.length - 1].depth >= poppedDepth) {
      this._keptAttrs.pop();
    }
    return node;
  }
  /**
   * Update current node's attribute values.
   * Useful when attributes are parsed after push.
   * @param {Object} attrValues
   */
  updateCurrent(attrValues) {
    if (this.path.length > 0) {
      const current = this.path[this.path.length - 1];
      if (attrValues !== null && attrValues !== void 0) {
        current.values = attrValues;
      }
    }
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    if (this.path.length === 0) return void 0;
    return this.path[this.path.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    if (this.path.length === 0) return false;
    const current = this.path[this.path.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get the value of a "kept" attribute from the nearest ancestor (or
   * current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
   * Unlike getAttrValue(), this works regardless of how deep the path has
   * gone since the attribute was pushed — but only for attribute names that
   * were explicitly marked with `keep` at push time. Cost is proportional to
   * the number of currently-kept attributes (typically 0-3), not path depth.
   * @param {string} attrName
   * @returns {*} the value, or undefined if no ancestor kept this attribute
   */
  getAnyParentAttr(attrName) {
    const kept = this._keptAttrs;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (kept[i].name === attrName) return kept[i].value;
    }
    return void 0;
  }
  /**
   * Check whether any ancestor (or the current node) kept the given
   * attribute via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAnyParentAttr(attrName) {
    const kept = this._keptAttrs;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (kept[i].name === attrName) return true;
    }
    return false;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    const sep2 = separator || this.separator;
    const isDefault = sep2 === this.separator && includeNamespace === true;
    if (isDefault) {
      if (this._pathStringCache !== null) {
        return this._pathStringCache;
      }
      const result = this.path.map(
        (n) => n.namespace ? `${n.namespace}:${n.tag}` : n.tag
      ).join(sep2);
      this._pathStringCache = result;
      return result;
    }
    return this.path.map(
      (n) => includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag
    ).join(sep2);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this.path.map((n) => n.tag);
  }
  /**
   * Reset the path to empty.
   */
  reset() {
    this._pathStringCache = null;
    this.path = [];
    this.siblingStacks = [];
    this._keptAttrs = [];
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    const segments = expression.segments;
    if (segments.length === 0) {
      return false;
    }
    if (expression.hasDeepWildcard()) {
      return this._matchWithDeepWildcard(segments);
    }
    return this._matchSimple(segments);
  }
  /**
   * @private
   */
  _matchSimple(segments) {
    if (this.path.length !== segments.length) {
      return false;
    }
    for (let i = 0; i < segments.length; i++) {
      if (!this._matchSegment(segments[i], this.path[i], i === this.path.length - 1)) {
        return false;
      }
    }
    return true;
  }
  /**
   * @private
   */
  _matchWithDeepWildcard(segments) {
    let pathIdx = this.path.length - 1;
    let segIdx = segments.length - 1;
    while (segIdx >= 0 && pathIdx >= 0) {
      const segment = segments[segIdx];
      if (segment.type === "deep-wildcard") {
        segIdx--;
        if (segIdx < 0) {
          return true;
        }
        const nextSeg = segments[segIdx];
        let found = false;
        for (let i = pathIdx; i >= 0; i--) {
          if (this._matchSegment(nextSeg, this.path[i], i === this.path.length - 1)) {
            pathIdx = i - 1;
            segIdx--;
            found = true;
            break;
          }
        }
        if (!found) {
          return false;
        }
      } else {
        if (!this._matchSegment(segment, this.path[pathIdx], pathIdx === this.path.length - 1)) {
          return false;
        }
        pathIdx--;
        segIdx--;
      }
    }
    return segIdx < 0;
  }
  /**
   * @private
   */
  _matchSegment(segment, node, isCurrentNode) {
    if (segment.tag !== "*" && segment.tag !== node.tag) {
      return false;
    }
    if (segment.namespace !== void 0) {
      if (segment.namespace !== "*" && segment.namespace !== node.namespace) {
        return false;
      }
    }
    if (segment.attrName !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      if (!node.values || !(segment.attrName in node.values)) {
        return false;
      }
      if (segment.attrValue !== void 0) {
        if (String(node.values[segment.attrName]) !== String(segment.attrValue)) {
          return false;
        }
      }
    }
    if (segment.position !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      const counter = node.counter ?? 0;
      if (segment.position === "first" && counter !== 0) {
        return false;
      } else if (segment.position === "odd" && counter % 2 !== 1) {
        return false;
      } else if (segment.position === "even" && counter % 2 !== 0) {
        return false;
      } else if (segment.position === "nth" && counter !== segment.positionValue) {
        return false;
      }
    }
    return true;
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this);
  }
  /**
   * Create a snapshot of current state.
   * @returns {Object}
   */
  snapshot() {
    return {
      path: this.path.map((node) => ({ ...node })),
      siblingStacks: this.siblingStacks.map((level) => level ? { counts: new Map(level.counts), total: level.total } : level),
      keptAttrs: this._keptAttrs.map((entry) => ({ ...entry }))
    };
  }
  /**
   * Restore state from snapshot.
   * @param {Object} snapshot
   */
  restore(snapshot) {
    this._pathStringCache = null;
    this.path = snapshot.path.map((node) => ({ ...node }));
    this.siblingStacks = snapshot.siblingStacks.map((level) => level ? { counts: new Map(level.counts), total: level.total } : level);
    this._keptAttrs = (snapshot.keptAttrs || []).map((entry) => ({ ...entry }));
  }
  /**
   * Return the read-only {@link MatcherView} for this matcher.
   *
   * The same instance is returned on every call — no allocation occurs.
   * It always reflects the current parser state and is safe to pass to
   * user callbacks without risk of accidental mutation.
   *
   * @returns {MatcherView}
   *
   * @example
   * const view = matcher.readOnly();
   * // pass view to callbacks — it stays in sync automatically
   * view.matches(expr);       // ✓
   * view.getCurrentTag();     // ✓
   * // view.push(...)         // ✗ method does not exist — caught by TypeScript
   */
  readOnly() {
    return this._view;
  }
};

// node_modules/is-unsafe/src/contexts/html.js
var HTML_PATTERNS = [
  {
    id: "html-script-open",
    description: "<script opening tag",
    pattern: /<script[\s>/]/i
  },
  {
    id: "html-script-close",
    description: "</script closing tag",
    pattern: /<\/script[\s>]/i
  },
  {
    id: "html-javascript-protocol",
    description: "javascript: URI scheme (with optional whitespace/encoding)",
    // Handles j&#x61;vascript:, j\u0061vascript:, and whitespace variants
    pattern: /j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i
  },
  {
    id: "html-vbscript-protocol",
    description: "vbscript: URI scheme",
    pattern: /vbscript[\t\n\r ]*:/i
  },
  {
    id: "html-data-html",
    description: "data:text/html URI \u2014 can execute scripts in browsers",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*text\/html/i
  },
  {
    id: "html-data-xhtml",
    description: "data:application/xhtml+xml URI",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i
  },
  {
    id: "html-data-svg",
    description: "data:image/svg+xml URI \u2014 can execute scripts",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i
  },
  {
    id: "html-inline-event-handler",
    description: "Inline event handler attributes: onclick=, onerror=, onload=, etc.",
    // \bon ensures we match a word boundary so "phonetic=" is not caught
    pattern: /\bon\w{1,30}\s*=/i
  },
  {
    id: "html-entity-obfuscated-script",
    description: "HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",
    // Entities include optional trailing semicolon: &#x3C; or &#x3C (both valid in HTML5)
    pattern: /(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i
  },
  {
    id: "html-entity-obfuscated-javascript",
    description: 'HTML-entity-encoded javascript: (partial \u2014 catches common &#106; or &#x6a; for "j")',
    pattern: /(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i
  },
  {
    id: "html-style-expression",
    description: "CSS expression() \u2014 IE-era code execution in style attributes",
    pattern: /style[\s\S]{0,20}expression\s*\(/i
  },
  {
    id: "html-object-embed",
    description: "<object or <embed tags that can load active content",
    pattern: /<(?:object|embed)[\s>/]/i
  },
  {
    id: "html-base-tag",
    description: "<base href= \u2014 can hijack all relative URLs on a page",
    pattern: /<base[\s>]/i
  },
  {
    id: "html-meta-refresh",
    description: '<meta http-equiv="refresh" \u2014 can redirect users',
    pattern: /<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i
  },
  {
    id: "html-srcdoc",
    description: "srcdoc= attribute on iframes \u2014 embeds HTML that can run scripts",
    pattern: /srcdoc\s*=/i
  },
  {
    id: "html-iframe",
    description: "<iframe tag",
    pattern: /<iframe[\s>/]/i
  },
  {
    id: "html-form",
    description: "<form tag \u2014 can be used for phishing / credential harvesting injection",
    pattern: /<form[\s>/]/i
  }
];
var html_default = HTML_PATTERNS;

// node_modules/is-unsafe/src/contexts/xml.js
var XML_PATTERNS = [
  {
    id: "xml-cdata-injection",
    description: "CDATA section injection: <![CDATA[ breaks out of text node context",
    pattern: /<!\[CDATA\[/i
  },
  {
    id: "xml-cdata-close",
    description: "CDATA close sequence: ]]> can terminate an enclosing CDATA section",
    pattern: /\]\]>/
  },
  {
    id: "xml-processing-instruction",
    description: "XML processing instruction: <?xml-stylesheet or <?php etc.",
    pattern: /<\?(?:xml[\- ]|php|asp)/i
  },
  {
    id: "xml-doctype-injection",
    description: "DOCTYPE declaration embedded in content \u2014 can define entities",
    // Match <!DOCTYPE followed by end-of-string, whitespace, or [ (internal subset)
    pattern: /<!DOCTYPE(?:[\s[]|$)/i
  },
  {
    id: "xml-entity-system",
    description: "SYSTEM keyword \u2014 used in external entity declarations (XXE)",
    pattern: /\bSYSTEM\s+["']/i
  },
  {
    id: "xml-entity-public",
    description: "PUBLIC keyword \u2014 used in external entity declarations (XXE)",
    pattern: /\bPUBLIC\s+["']/i
  },
  {
    id: "xml-entity-declaration",
    description: "<!ENTITY declaration \u2014 defines entities, potential XXE or entity expansion",
    pattern: /<!ENTITY[\s%]/i
  },
  {
    id: "xml-billion-laughs",
    description: "Entity reference chaining / billion laughs: repeated &eX; style references",
    // Heuristic: 3+ consecutive entity refs suggests expansion attack
    pattern: /(?:&\w{1,20};){3,}/
  },
  {
    id: "xml-namespace-confusion",
    description: "xmlns: attribute injection \u2014 can redefine namespaces to confuse parsers",
    // pattern: /\bxmlns\s*(?::\w{1,40})?\s*=/i,
    pattern: /\bxmlns(?::\w{1,40})?\s*=/i
  },
  {
    id: "xml-comment-injection",
    description: "<!-- comment injection \u2014 can hide content from some parsers",
    pattern: /<!--/
  },
  {
    id: "xml-comment-close",
    description: "--> closes an enclosing XML comment",
    pattern: /-->/
  },
  {
    id: "xml-pi-close",
    description: "?> closes an enclosing processing instruction",
    pattern: /\?>/
  }
];
var xml_default = XML_PATTERNS;

// node_modules/is-unsafe/src/contexts/svg.js
var SVG_PATTERNS = [
  {
    id: "svg-script-element",
    description: "<script element inside SVG executes JavaScript",
    pattern: /<script[\s>/]/i
  },
  {
    id: "svg-xlink-href-javascript",
    description: "xlink:href with javascript: \u2014 classic SVG XSS via <a> or <use>",
    pattern: /xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-href-javascript",
    description: "href= with javascript: in SVG context (<a>, <animate>, etc.)",
    pattern: /href\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-foreignobject",
    description: "<foreignObject embeds HTML inside SVG \u2014 can execute scripts",
    pattern: /<foreignObject[\s>/]/i
  },
  {
    id: "svg-use-external",
    description: "<use xlink:href or href pointing to external resource (non-fragment URL)",
    // Match <use with href= where the value starts with a non-# character (external URL)
    // [\"'][^#] catches quoted values not starting with #; [^\"'#\s>] catches unquoted
    pattern: /<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i
  },
  {
    id: "svg-animate-href",
    description: '<animate attributeName="href" \u2014 can dynamically change href to javascript:',
    pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i
  },
  {
    id: "svg-animate-xlinkhref",
    description: '<animate attributeName="xlink:href"',
    pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i
  },
  {
    id: "svg-set-javascript",
    description: '<set to="javascript:..." \u2014 sets an attribute to a javascript: URI',
    pattern: /<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-event-handler",
    description: "SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",
    pattern: /\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i
  },
  {
    id: "svg-handler-generic",
    description: "Generic on* handler catch-all for SVG attributes",
    pattern: /\bon\w{1,30}\s*=/i
  },
  {
    id: "svg-filter-feimage",
    description: "<feImage href= \u2014 filter primitive that can load external resources",
    pattern: /<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i
  },
  {
    id: "svg-image-external",
    description: "<image xlink:href with http/https or javascript protocol",
    pattern: /<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i
  },
  {
    id: "svg-style-javascript",
    description: "style= attribute containing javascript: (e.g. background:url(javascript:...))",
    pattern: /style\s*=[\s\S]{0,60}javascript\s*:/i
  }
];
var svg_default = SVG_PATTERNS;

// node_modules/is-unsafe/src/contexts/sql.js
var SQL_PATTERNS = [
  {
    id: "sql-block-comment-open",
    description: "SQL block comment open: /* ... */ \u2014 unusual in legitimate user text",
    pattern: /\/\*/
  },
  {
    id: "sql-union-select",
    description: "UNION SELECT \u2014 most common SQL injection aggregation attack",
    pattern: /\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i
  },
  {
    id: "sql-drop-table",
    description: "DROP TABLE \u2014 destructive DDL injection",
    pattern: /\bDROP\s{1,20}TABLE\b/i
  },
  {
    id: "sql-drop-database",
    description: "DROP DATABASE \u2014 destructive DDL injection",
    pattern: /\bDROP\s{1,20}DATABASE\b/i
  },
  {
    id: "sql-insert-into",
    description: "INSERT INTO \u2014 data injection",
    pattern: /\bINSERT\s{1,20}INTO\b/i
  },
  {
    id: "sql-delete-from",
    description: "DELETE FROM \u2014 data deletion injection",
    pattern: /\bDELETE\s{1,20}FROM\b/i
  },
  {
    id: "sql-update-set",
    description: "UPDATE ... SET \u2014 data modification injection",
    // Allows arbitrary content between UPDATE and SET (table name, alias, etc.)
    pattern: /\bUPDATE\b[\s\S]{1,60}\bSET\b/i
  },
  {
    id: "sql-exec-xp",
    description: "EXEC xp_ \u2014 MSSQL extended stored procedure execution",
    pattern: /\bEXEC(?:UTE)?\s{1,20}xp_/i
  },
  {
    id: "sql-tautology-string",
    description: `Classic string tautology: ' OR '1'='1 or " OR "1"="1"`,
    // Last quote is optional — injection may truncate it: ' OR '1'='1--
    pattern: /'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i
  },
  {
    id: "sql-tautology-numeric",
    description: "Numeric tautology: OR 1=1",
    pattern: /\bOR\s{1,10}1\s*=\s*1\b/i
  },
  {
    id: "sql-always-true-zero",
    description: "Numeric tautology: OR 0=0",
    pattern: /\bOR\s{1,10}0\s*=\s*0\b/i
  },
  {
    id: "sql-sleep-benchmark",
    description: "Time-based blind injection: SLEEP() or BENCHMARK()",
    pattern: /\b(?:SLEEP|BENCHMARK)\s*\(/i
  },
  {
    id: "sql-waitfor-delay",
    description: "MSSQL time-based blind injection: WAITFOR DELAY",
    pattern: /\bWAITFOR\s{1,20}DELAY\b/i
  },
  {
    id: "sql-char-function",
    description: "CHAR() function \u2014 used to obfuscate injected strings",
    pattern: /\bCHAR\s*\(\s*\d{1,3}/i
  },
  {
    id: "sql-information-schema",
    description: "INFORMATION_SCHEMA \u2014 reconnaissance query for table/column enumeration",
    pattern: /\bINFORMATION_SCHEMA\b/i
  }
];
var sql_default = SQL_PATTERNS;

// node_modules/is-unsafe/src/contexts/shell.js
var SHELL_PATTERNS = [
  {
    id: "shell-path-traversal-unix",
    description: "Unix path traversal: ../  \u2014 climbing the directory tree",
    pattern: /\.\.\//
  },
  {
    id: "shell-path-traversal-windows",
    description: "Windows path traversal: ..\\ \u2014 climbing the directory tree",
    pattern: /\.\.\\/
  },
  {
    id: "shell-path-traversal-encoded",
    description: "URL-encoded path traversal: %2e%2e or %2f variants",
    pattern: /%2e%2e|%2f\.\.|\.\.%2f/i
  },
  {
    id: "shell-null-byte",
    description: "Null byte injection: \\x00 or %00 \u2014 truncates strings in C-backed functions",
    pattern: /\x00|%00/
  },
  {
    id: "shell-semicolon",
    description: "Semicolon command separator: cmd1; cmd2",
    pattern: /;/
  },
  {
    id: "shell-pipe",
    description: "Pipe operator: cmd1 | cmd2",
    pattern: /\|/
  },
  {
    id: "shell-and-operator",
    description: "AND operator: cmd1 && cmd2",
    pattern: /&&/
  },
  {
    id: "shell-or-operator",
    description: "OR operator: cmd1 || cmd2",
    pattern: /\|\|/
  },
  {
    id: "shell-backtick",
    description: "Backtick command substitution: `cmd`",
    pattern: /`/
  },
  {
    id: "shell-dollar-paren",
    description: "Dollar-paren command substitution: $(cmd)",
    pattern: /\$\(/
  },
  {
    id: "shell-dollar-brace",
    description: "Dollar-brace variable expansion: ${var} \u2014 can be abused for injection",
    pattern: /\$\{/
  },
  {
    id: "shell-redirect-out",
    description: "Output redirection: cmd > file or cmd >> file",
    pattern: />{1,2}/
  },
  {
    id: "shell-redirect-in",
    description: "Input redirection: cmd < file",
    pattern: /</
  },
  {
    id: "shell-newline-injection",
    description: "Newline injection: \\n or \\r \u2014 can inject new shell commands",
    pattern: /[\n\r]/
  },
  {
    id: "shell-glob-star",
    description: "Glob expansion: * or ? \u2014 can expand to unintended files",
    // Only flag when combined with path separators to reduce false positives
    pattern: /[/\\][*?]/
  },
  {
    id: "shell-absolute-root",
    description: "Absolute root path injection: string starting with / or \\ (Windows UNC)",
    pattern: /^(?:\/|\\\\)/
  },
  {
    id: "shell-windows-drive",
    description: "Windows drive letter path injection: C:\\ or D:/",
    pattern: /^[a-zA-Z]:[/\\]/
  },
  {
    id: "shell-curl-wget",
    description: "curl/wget with URL or flags \u2014 can exfiltrate data or download payloads",
    // Require a URL scheme (http/https/ftp) or a flag (-) to reduce false positives
    // "curl is a tool" won't match; "curl http://..." or "curl -s ..." will
    pattern: /\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i
  }
];
var shell_default = SHELL_PATTERNS;

// node_modules/is-unsafe/src/contexts/redos.js
var REDOS_PATTERNS = [
  {
    id: "redos-nested-quantifier-plus",
    description: "Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",
    // Matches any group containing a + quantifier, with an outer * or + — catches (a+)+, (.+b)*, etc.
    pattern: /\([^)]*\+[^)]*\)[+*]/
  },
  {
    id: "redos-nested-quantifier-star",
    description: "Nested * quantifier: (a*)* or (a*)+ \u2014 catastrophic backtracking",
    pattern: /\([^)]*\*[^)]*\)[*+]/
  },
  {
    id: "redos-nested-groups",
    description: "Doubly nested quantified groups: ((a+)+) \u2014 guaranteed catastrophic",
    pattern: /\(\([^)]{0,40}\)[+*]\)[+*]/
  },
  {
    id: "redos-alternation-overlap",
    description: "Overlapping alternation under quantifier: (a|a)+ \u2014 ambiguous NFA paths",
    // Detect repeated identical alternatives under a quantifier
    pattern: /\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/
  },
  {
    id: "redos-star-plus-concat",
    description: "(x*x)+ pattern \u2014 triggers super-linear backtracking",
    pattern: /\([^)]{0,10}\*[^)]{0,10}\)[+*]/
  },
  {
    id: "redos-dot-star-greedy",
    description: "(.*){n,} or (.+){n,} \u2014 repeated greedy dot quantifiers",
    pattern: /\(\.[*+]\)\{?\d/
  },
  {
    id: "redos-large-repetition",
    description: "Very large fixed or range repetition count {1000,} or {1000,n} \u2014 denial of service via backtracking",
    // Matches { followed by 4+ digits (≥1000), then optional ,digits }
    pattern: /\{\d{4,}(?:,\d*)?\}/
  },
  {
    id: "redos-catastrophic-alternation",
    description: "Long alternation with many similar branches \u2014 polynomial backtracking risk",
    // Heuristic: 10+ pipe-separated alternatives in a single group
    pattern: /\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/
  }
];
var redos_default = REDOS_PATTERNS;

// node_modules/is-unsafe/src/contexts/nosql.js
var sep = `["'\\s]*:`;
var NOSQL_PATTERNS = [
  // ─── MongoDB $ operator injection ────────────────────────────────────────
  {
    id: "nosql-where-operator",
    description: "$where \u2014 executes arbitrary JavaScript server-side in MongoDB",
    pattern: new RegExp(`\\$where${sep}`, "i")
  },
  {
    id: "nosql-ne-operator",
    description: '$ne \u2014 "not equal" operator used to bypass equality checks',
    pattern: new RegExp(`\\$ne${sep}`, "i")
  },
  {
    id: "nosql-gt-operator",
    description: '$gt \u2014 "greater than" used to bypass password/value checks',
    pattern: new RegExp(`\\$gte?${sep}`, "i")
  },
  {
    id: "nosql-lt-operator",
    description: '$lt / $lte \u2014 "less than" bypass variants',
    pattern: new RegExp(`\\$lte?${sep}`, "i")
  },
  {
    id: "nosql-regex-operator",
    description: "$regex \u2014 can be used to extract data character by character (blind injection)",
    pattern: new RegExp(`\\$regex${sep}`, "i")
  },
  {
    id: "nosql-or-operator",
    description: "$or \u2014 logical OR; used to create always-true conditions",
    pattern: new RegExp(`\\$or${sep}\\s*\\[`, "i")
  },
  {
    id: "nosql-and-operator",
    description: "$and \u2014 logical AND operator injection",
    pattern: new RegExp(`\\$and${sep}\\s*\\[`, "i")
  },
  {
    id: "nosql-nor-operator",
    description: "$nor \u2014 logical NOR operator injection",
    pattern: new RegExp(`\\$nor${sep}\\s*\\[`, "i")
  },
  {
    id: "nosql-exists-operator",
    description: "$exists \u2014 can enumerate fields to determine schema",
    pattern: new RegExp(`\\$exists${sep}`, "i")
  },
  {
    id: "nosql-in-operator",
    description: "$in \u2014 matches any value in a list; can enumerate values",
    pattern: new RegExp(`\\$in${sep}\\s*\\[`, "i")
  },
  {
    id: "nosql-expr-operator",
    description: "$expr \u2014 allows aggregation expressions in queries (MongoDB 3.6+)",
    pattern: new RegExp(`\\$expr${sep}`, "i")
  },
  {
    id: "nosql-function-operator",
    description: "$function \u2014 executes arbitrary JavaScript in MongoDB 4.4+",
    pattern: new RegExp(`\\$function${sep}`, "i")
  },
  {
    id: "nosql-accumulator-operator",
    description: "$accumulator \u2014 custom aggregation with arbitrary JS execution",
    pattern: new RegExp(`\\$accumulator${sep}`, "i")
  },
  // ─── Prototype pollution ─────────────────────────────────────────────────
  {
    id: "nosql-proto-pollution",
    description: "__proto__ \u2014 prototype pollution via object key injection",
    pattern: /__proto__/
  },
  {
    id: "nosql-constructor-prototype",
    description: "constructor.prototype \u2014 alternative prototype pollution vector (dot notation or JSON key)",
    // Matches dot-notation (obj.constructor.prototype) and JSON key adjacency
    // ("constructor": {"prototype": ...})
    pattern: /constructor[\s"':.,{\[]*prototype/i
  },
  {
    id: "nosql-proto-bracket",
    description: '["__proto__"] \u2014 bracket-notation prototype pollution',
    pattern: /\[["']__proto__["']\]/
  }
];
var nosql_default = NOSQL_PATTERNS;

// node_modules/is-unsafe/src/contexts/log.js
var LOG_PATTERNS = [
  // ─── CRLF / newline injection ─────────────────────────────────────────────
  {
    id: "log-crlf-injection",
    description: "CRLF injection: literal \\r or \\n embeds fake log lines",
    pattern: /[\r\n]/
  },
  {
    id: "log-url-encoded-crlf",
    description: "URL-encoded CRLF: %0d, %0a, %0D, %0A \u2014 decoded by some log parsers",
    pattern: /%0[dDaA]/
  },
  {
    id: "log-unicode-newline",
    description: "Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",
    pattern: /[\u2028\u2029]/
  },
  // ─── Log4Shell / JNDI injection (CVE-2021-44228) ─────────────────────────
  {
    id: "log-log4shell-jndi",
    description: "Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",
    pattern: /\$\{jndi\s*:/i
  },
  {
    id: "log-log4shell-obfuscated",
    description: "Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",
    // ${::- is the Log4j lookup-bypass escape sequence; presence alone is suspicious
    pattern: /\$\{::-/
  },
  {
    id: "log-log4j-lookup",
    description: "Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} \u2014 data exfiltration",
    pattern: /\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i
  },
  // ─── Server-Side Template Injection (SSTI) in log messages ───────────────
  {
    id: "log-ssti-double-brace",
    description: "SSTI double-brace: {{expression}} \u2014 Jinja2, Twig, Handlebars, etc.",
    pattern: /\{\{[\s\S]{0,80}\}\}/
  },
  {
    id: "log-ssti-hash-brace",
    description: "SSTI hash-brace: #{expression} \u2014 Thymeleaf, Velocity, Ruby ERB",
    pattern: /#\{[\s\S]{0,80}\}/
  },
  {
    id: "log-ssti-dollar-brace",
    description: "SSTI/EL injection: ${expression with operators or method calls} \u2014 JSP EL, Freemarker, SpEL",
    // Require that the ${...} content looks like an expression, not a plain variable name.
    // Flags if the content contains: . ( * + operators, or known SSTI keywords.
    // This avoids flagging ${PATH}, ${HOME} etc. (plain shell variables).
    pattern: /\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i
  },
  {
    id: "log-ssti-percent-tag",
    description: "SSTI ERB/ASP tag: <%= expression %> \u2014 Ruby ERB, ASP",
    pattern: /<%=[\s\S]{0,80}%>/
  },
  // ─── Null byte ────────────────────────────────────────────────────────────
  {
    id: "log-null-byte",
    description: "Null byte: \\x00 or %00 \u2014 can truncate log entries in C-backed loggers",
    pattern: /\x00|%00/
  },
  // ─── ANSI escape injection ────────────────────────────────────────────────
  {
    id: "log-ansi-escape",
    description: "ANSI escape sequence: ESC[ \u2014 can manipulate terminal output when logs are tailed",
    pattern: /\x1b\[/
  }
];
var log_default = LOG_PATTERNS;

// node_modules/is-unsafe/src/contexts/sql-strict.js
var SQL_STRICT_EXTRA = [
  {
    id: "sql-line-comment",
    description: "SQL line comment: -- followed by whitespace or end of string",
    pattern: /--(?:\s|$)/
  },
  {
    id: "sql-stacked-query",
    description: "Stacked queries: semicolon immediately followed by a SQL keyword",
    pattern: /;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i
  },
  {
    id: "sql-hex-encoding",
    description: "Hex-encoded string injection: 0x41414141 style (MySQL)",
    pattern: /\b0x[0-9a-f]{4,}/i
  }
];
var SQL_STRICT_PATTERNS = [...sql_default, ...SQL_STRICT_EXTRA];
var sql_strict_default = SQL_STRICT_PATTERNS;

// node_modules/is-unsafe/src/util/decode-entities.js
var NAMED = Object.freeze({
  colon: ":",
  Tab: "	",
  NewLine: "\n"
});
var ENTITY_RE = /&(?:#[xX]0*([0-9a-fA-F]{1,6});?|#0*([0-9]{1,7});?|([a-zA-Z][a-zA-Z0-9]{1,15});)/g;
function decodeEntities(input) {
  if (input.indexOf("&") === -1) return input;
  return input.replace(ENTITY_RE, (match, hex, dec, name) => {
    if (name !== void 0) {
      return Object.prototype.hasOwnProperty.call(NAMED, name) ? NAMED[name] : match;
    }
    const cp = hex !== void 0 ? parseInt(hex, 16) : parseInt(dec, 10);
    if (!Number.isFinite(cp) || cp > 1114111) return match;
    return String.fromCodePoint(cp);
  });
}

// node_modules/is-unsafe/src/index.js
html_default.label = "HTML";
xml_default.label = "XML";
svg_default.label = "SVG";
html_default.decodeEntities = true;
xml_default.decodeEntities = true;
svg_default.decodeEntities = true;
sql_default.label = "SQL";
sql_strict_default.label = "SQL-STRICT";
shell_default.label = "SHELL";
redos_default.label = "REDOS";
nosql_default.label = "NOSQL";
log_default.label = "LOG";
var VALID_CONTEXTS = Object.freeze({
  HTML: html_default,
  XML: xml_default,
  SVG: svg_default,
  SQL: sql_default,
  "SQL-STRICT": sql_strict_default,
  SHELL: shell_default,
  REDOS: redos_default,
  NOSQL: nosql_default,
  LOG: log_default
});
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      `is-unsafe: first argument must be a string, got ${typeof value}`
    );
  }
}
function assertContext(context) {
  if (context instanceof RegExp) return;
  if (Array.isArray(context)) {
    if (context.length === 0) {
      throw new TypeError("is-unsafe: context must not be an empty array");
    }
    if (Array.isArray(context[0])) {
      for (const list of context) {
        if (!Array.isArray(list) || list.length === 0) {
          throw new TypeError(
            "is-unsafe: each context in the array must be a non-empty pattern array (PatternList)"
          );
        }
      }
    }
    return;
  }
  throw new TypeError(
    `is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof context}`
  );
}
function normalise(context) {
  if (context instanceof RegExp) return { lists: null, regex: context };
  if (Array.isArray(context[0])) return { lists: context, regex: null };
  return { lists: [context], regex: null };
}
function decodedCopy(value, list) {
  if (!list.decodeEntities) return null;
  const decoded = decodeEntities(value);
  return decoded === value ? null : decoded;
}
function matchList(value, list) {
  const label = list.label ?? "CUSTOM";
  const decoded = decodedCopy(value, list);
  for (const rule of list) {
    if (rule.pattern.test(value) || decoded !== null && rule.pattern.test(decoded)) {
      return { context: label, id: rule.id, description: rule.description, pattern: rule.pattern };
    }
  }
  return null;
}
function isUnsafe(value, context) {
  assertString(value);
  assertContext(context);
  const { lists, regex } = normalise(context);
  if (regex) return regex.test(value);
  for (const list of lists) {
    if (matchList(value, list) !== null) return true;
  }
  return false;
}

// node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
function extractRawAttributes(prefixedAttrs, options) {
  if (!prefixedAttrs) return {};
  const attrs2 = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
  if (!attrs2) return {};
  const rawAttrs = {};
  for (const key in attrs2) {
    if (key.startsWith(options.attributeNamePrefix)) {
      const rawName = key.substring(options.attributeNamePrefix.length);
      rawAttrs[rawName] = attrs2[key];
    } else {
      rawAttrs[key] = attrs2[key];
    }
  }
  return rawAttrs;
}
function extractNamespace(rawTagName) {
  if (!rawTagName || typeof rawTagName !== "string") return void 0;
  const colonIndex = rawTagName.indexOf(":");
  if (colonIndex !== -1 && colonIndex > 0) {
    const ns = rawTagName.substring(0, colonIndex);
    if (ns !== "xmlns") {
      return ns;
    }
  }
  return void 0;
}
var OrderedObjParser = class {
  constructor(options, externalEntities) {
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.entityExpansionCount = 0;
    this.currentExpandedLength = 0;
    this.doctypefound = false;
    let namedEntities = { ...XML };
    if (this.options.entityDecoder) {
      this.entityDecoder = this.options.entityDecoder;
    } else {
      if (typeof this.options.htmlEntities === "object") namedEntities = this.options.htmlEntities;
      else if (this.options.htmlEntities === true) namedEntities = { ...COMMON_HTML, ...CURRENCY };
      this.entityDecoder = new EntityDecoder({
        namedEntities: { ...namedEntities, ...externalEntities },
        numericAllowed: this.options.htmlEntities,
        limit: {
          maxTotalExpansions: this.options.processEntities.maxTotalExpansions,
          maxExpandedLength: this.options.processEntities.maxExpandedLength,
          applyLimitsTo: this.options.processEntities.appliesTo
        },
        // onExternalEntity: (name, value) => isUnsafe(value) ? 'block' : 'allow',
        onInputEntity: (name, value) => (
          //TODO: VALID_CONTEXTS.HTML should be set only if this.options.htmlEntities
          isUnsafe(value, [html_default, xml_default]) ? ENTITY_ACTION.BLOCK : ENTITY_ACTION.ALLOW
        )
        //postCheck: resolved => resolved
      });
    }
    this.matcher = new Matcher();
    this.readonlyMatcher = this.matcher.readOnly();
    this.isCurrentNodeStopNode = false;
    this.stopNodeExpressionsSet = new ExpressionSet();
    const stopNodesOpts = this.options.stopNodes;
    if (stopNodesOpts && stopNodesOpts.length > 0) {
      for (let i = 0; i < stopNodesOpts.length; i++) {
        const stopNodeExp = stopNodesOpts[i];
        if (typeof stopNodeExp === "string") {
          this.stopNodeExpressionsSet.add(new Expression(stopNodeExp));
        } else if (stopNodeExp instanceof Expression) {
          this.stopNodeExpressionsSet.add(stopNodeExp);
        }
      }
      this.stopNodeExpressionsSet.seal();
    }
  }
};
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  const options = this.options;
  if (val !== void 0) {
    if (options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if (val.length > 0) {
      if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
      const jPathOrMatcher = options.jPath ? jPath.toString() : jPath;
      const newval = options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
      if (newval === null || newval === void 0) {
        return val;
      } else if (typeof newval !== typeof val || newval !== val) {
        return newval;
      } else if (options.trimValues) {
        return parseValue(val, options.parseTagValue, options.numberParseOptions);
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal === val) {
          return parseValue(val, options.parseTagValue, options.numberParseOptions);
        } else {
          return val;
        }
      }
    }
  }
}
function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(":");
    const prefix = tagname.charAt(0) === "/" ? "/" : "";
    if (tags[0] === "xmlns") {
      return "";
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}
var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
function buildAttributesMap(attrStr, jPath, tagName, force = false) {
  const options = this.options;
  if (force === true || options.ignoreAttributes !== true && typeof attrStr === "string") {
    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length;
    const attrs2 = {};
    const processedVals = new Array(len);
    let hasRawAttrs = false;
    const rawAttrsForMatcher = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const oldVal = matches[i][4];
      if (attrName.length && oldVal !== void 0) {
        let val = oldVal;
        if (options.trimValues) val = val.trim();
        val = this.replaceEntitiesValue(val, tagName, this.readonlyMatcher);
        processedVals[i] = val;
        rawAttrsForMatcher[attrName] = val;
        hasRawAttrs = true;
      }
    }
    if (hasRawAttrs && typeof jPath === "object" && jPath.updateCurrent) {
      jPath.updateCurrent(rawAttrsForMatcher);
    }
    const jPathStr = options.jPath ? jPath.toString() : this.readonlyMatcher;
    let hasAttrs = false;
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
      let aName = options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (options.transformAttributeName) {
          aName = options.transformAttributeName(aName);
        }
        aName = sanitizeName(aName, options);
        if (matches[i][4] !== void 0) {
          const oldVal = processedVals[i];
          const newVal = options.attributeValueProcessor(attrName, oldVal, jPathStr);
          if (newVal === null || newVal === void 0) {
            attrs2[aName] = oldVal;
          } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
            attrs2[aName] = newVal;
          } else {
            attrs2[aName] = parseValue(oldVal, options.parseAttributeValue, options.numberParseOptions);
          }
          hasAttrs = true;
        } else if (options.allowBooleanAttributes) {
          attrs2[aName] = true;
          hasAttrs = true;
        }
      }
    }
    if (!hasAttrs) return;
    if (options.attributesGroupName && !options.preserveOrder) {
      const attrCollection = {};
      attrCollection[options.attributesGroupName] = attrs2;
      return attrCollection;
    }
    return attrs2;
  }
}
var parseXml = function(xmlData) {
  const options = this.options;
  const crlfPositions = options.captureMetaData ? [] : void 0;
  xmlData = xmlData.replace(/\r\n?/g, options.captureMetaData ? (newline, index) => {
    if (newline.length === 2) {
      crlfPositions.push(index - crlfPositions.length);
    }
    return "\n";
  } : "\n");
  const xmlObj = new XmlNode("!xml");
  let currentNode = xmlObj;
  let textData = "";
  this.matcher.reset();
  this.entityDecoder.reset();
  this.entityExpansionCount = 0;
  this.currentExpandedLength = 0;
  this.doctypefound = false;
  const docTypeReader = new DocTypeReader(options.processEntities);
  const xmlLen = xmlData.length;
  for (let i = 0; i < xmlLen; i++) {
    const ch = xmlData[i];
    if (ch === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i + 2, closeIndex).trim();
        if (options.removeNSPrefix) {
          const colonIndex = tagName.indexOf(":");
          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        tagName = transformTagName(options.transformTagName, tagName, "", options).tagName;
        if (currentNode) {
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        }
        const lastTagName = this.matcher.getCurrentTag();
        if (tagName && options.unpairedTagsSet.has(tagName)) {
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        if (lastTagName && options.unpairedTagsSet.has(lastTagName)) {
          this.matcher.pop();
          this.tagsNodeStack.pop();
        }
        this.matcher.pop();
        this.isCurrentNodeStopNode = false;
        currentNode = this.tagsNodeStack.pop() || xmlObj;
        if (options.captureMetaData && currentNode) {
          currentNode.addEndIndex(getOriginalIndex(closeIndex + 1, crlfPositions));
        }
        textData = "";
        i = closeIndex;
      } else if (c1 === 63) {
        let tagData = readTagExp(xmlData, i, false, "?>");
        if (!tagData) throw new Error("Pi Tag is not closed.");
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        const attsMap = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName, true);
        if (attsMap) {
          const ver = attsMap[this.options.attributeNamePrefix + "version"];
          this.entityDecoder.setXmlVersion(Number(ver) || 1);
          docTypeReader.setXmlVersion(Number(ver) || 1);
        }
        if (options.ignoreDeclaration && tagData.tagName === "?xml" || options.ignorePiTags) {
        } else {
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(options.textNodeName, "");
          if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent && options.ignoreAttributes !== true) {
            childNode[":@"] = attsMap;
          }
          const startIndex = options.captureMetaData ? getOriginalIndex(i, crlfPositions) : i;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
          if (options.captureMetaData) {
            currentNode.addEndIndex(getOriginalIndex(tagData.closeIndex + 2, crlfPositions));
          }
        }
        i = tagData.closeIndex + 1;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
        if (options.commentPropName) {
          const comment = xmlData.substring(i + 4, endIndex - 2);
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
          currentNode.add(options.commentPropName, [{ [options.textNodeName]: comment }]);
        }
        i = endIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 68) {
        if (this.doctypefound) throw new Error("Multiple DOCTYPE declarations found.");
        this.doctypefound = true;
        const result = docTypeReader.readDocType(xmlData, i);
        this.entityDecoder.addInputEntities(result.entities);
        i = result.i;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9, closeIndex);
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
        if (val == void 0) val = "";
        if (options.cdataPropName) {
          currentNode.add(options.cdataPropName, [{ [options.textNodeName]: tagExp }]);
        } else {
          currentNode.add(options.textNodeName, val);
        }
        i = closeIndex + 2;
      } else {
        let result = readTagExp(xmlData, i, options.removeNSPrefix);
        if (!result) {
          const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlLen, i + 50));
          throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
        }
        let tagName = result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;
        ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
        if (options.strictReservedNames && (tagName === options.commentPropName || tagName === options.cdataPropName || tagName === options.textNodeName || tagName === options.attributesGroupName)) {
          throw new Error(`Invalid tag name: ${tagName}`);
        }
        if (currentNode && textData) {
          if (currentNode.tagname !== "!xml") {
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
          }
        }
        const lastTag = currentNode;
        if (lastTag && options.unpairedTagsSet.has(lastTag.tagname)) {
          currentNode = this.tagsNodeStack.pop();
          this.matcher.pop();
        }
        let isSelfClosing = false;
        if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
          isSelfClosing = true;
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          } else {
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }
          attrExpPresent = tagName !== tagExp;
        }
        let prefixedAttrs = null;
        let rawAttrs = {};
        let namespace = void 0;
        namespace = extractNamespace(rawTagName);
        if (tagName !== xmlObj.tagname) {
          this.matcher.push(tagName, {}, namespace);
        }
        if (tagName !== tagExp && attrExpPresent) {
          prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
          if (prefixedAttrs) {
            rawAttrs = extractRawAttributes(prefixedAttrs, options);
          }
        }
        if (tagName !== xmlObj.tagname) {
          this.isCurrentNodeStopNode = this.isItStopNode();
        }
        const startIndex = options.captureMetaData ? getOriginalIndex(i, crlfPositions) : i;
        if (this.isCurrentNodeStopNode) {
          let tagContent = "";
          if (isSelfClosing) {
            i = result.closeIndex;
          } else if (options.unpairedTagsSet.has(tagName)) {
            i = result.closeIndex;
          } else {
            const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result2.i;
            tagContent = result2.tagContent;
          }
          const childNode = new XmlNode(tagName);
          if (prefixedAttrs) {
            childNode[":@"] = prefixedAttrs;
          }
          childNode.add(options.textNodeName, tagContent);
          this.matcher.pop();
          this.isCurrentNodeStopNode = false;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
          if (options.captureMetaData) {
            currentNode.addEndIndex(getOriginalIndex(i + 1, crlfPositions));
          }
        } else {
          if (isSelfClosing) {
            ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            if (options.captureMetaData) {
              currentNode.addEndIndex(getOriginalIndex(closeIndex + 1, crlfPositions));
            }
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
          } else if (options.unpairedTagsSet.has(tagName)) {
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            if (options.captureMetaData) {
              currentNode.addEndIndex(getOriginalIndex(result.closeIndex + 1, crlfPositions));
            }
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            i = result.closeIndex;
            continue;
          } else {
            const childNode = new XmlNode(tagName);
            if (this.tagsNodeStack.length > options.maxNestedTags) {
              throw new Error("Maximum nested tags exceeded");
            }
            this.tagsNodeStack.push(currentNode);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    } else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};
function getOriginalIndex(index, crlfPositions) {
  let low = 0;
  let high = crlfPositions.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (crlfPositions[middle] < index) low = middle + 1;
    else high = middle;
  }
  return index + low;
}
function addChild(currentNode, childNode, matcher, startIndex) {
  if (!this.options.captureMetaData) startIndex = void 0;
  const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
  const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
  if (result === false) {
  } else if (typeof result === "string") {
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  } else {
    currentNode.addChild(childNode, startIndex);
  }
}
function replaceEntitiesValue(val, tagName, jPath) {
  const entityConfig = this.options.processEntities;
  if (!entityConfig || !entityConfig.enabled) {
    return val;
  }
  if (entityConfig.allowedTags) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    const allowed = Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher);
    if (!allowed) {
      return val;
    }
  }
  if (entityConfig.tagFilter) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) {
      return val;
    }
  }
  return this.entityDecoder.decode(val);
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
  if (textData) {
    if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
    textData = this.parseTextData(
      textData,
      parentNode.tagname,
      matcher,
      false,
      parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
      isLeafNode
    );
    if (textData !== void 0 && textData !== "")
      parentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}
function isItStopNode() {
  if (this.stopNodeExpressionsSet.size === 0) return false;
  return this.matcher.matchesAny(this.stopNodeExpressionsSet);
}
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
  let attrBoundary = 0;
  const len = xmlData.length;
  const closeCode0 = closingChar.charCodeAt(0);
  const closeCode1 = closingChar.length > 1 ? closingChar.charCodeAt(1) : -1;
  let result = "";
  let segmentStart = i;
  for (let index = i; index < len; index++) {
    const code = xmlData.charCodeAt(index);
    if (attrBoundary) {
      if (code === attrBoundary) attrBoundary = 0;
    } else if (code === 34 || code === 39) {
      attrBoundary = code;
    } else if (code === closeCode0) {
      if (closeCode1 !== -1) {
        if (xmlData.charCodeAt(index + 1) === closeCode1) {
          result += xmlData.substring(segmentStart, index);
          return { data: result, index };
        }
      } else {
        result += xmlData.substring(segmentStart, index);
        return { data: result, index };
      }
    } else if (code === 9 && !attrBoundary) {
      result += xmlData.substring(segmentStart, index) + " ";
      segmentStart = index + 1;
    }
  }
}
function findClosingIndex(xmlData, str, i, errMsg) {
  const closingIndex = xmlData.indexOf(str, i);
  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str.length - 1;
  }
}
function findClosingChar(xmlData, char, i, errMsg) {
  const closingIndex = xmlData.indexOf(char, i);
  if (closingIndex === -1) throw new Error(errMsg);
  return closingIndex;
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
  const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
  if (!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if (separatorIndex !== -1) {
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }
  const rawTagName = tagName;
  if (removeNSPrefix) {
    const colonIndex = tagName.indexOf(":");
    if (colonIndex !== -1) {
      tagName = tagName.substr(colonIndex + 1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }
  return {
    tagName,
    tagExp,
    closeIndex,
    attrExpPresent,
    rawTagName
  };
}
function readStopNodeData(xmlData, tagName, i) {
  const startIndex = i;
  let openTagCount = 1;
  let lenient = false;
  let nextGt = -1;
  const xmllen = xmlData.length;
  for (; i < xmllen; i++) {
    if (xmlData[i] === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingChar(xmlData, ">", i, `${tagName} is not closed`);
        let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
        if (closeTagName === tagName) {
          openTagCount--;
          if (openTagCount === 0) {
            return {
              tagContent: xmlData.substring(startIndex, i),
              i: closeIndex
            };
          }
        }
        i = closeIndex;
      } else if (c1 === 63) {
        const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
        i = closeIndex;
      } else {
        const tagData = lenient ? void 0 : readTagExp(xmlData, i, false);
        if (tagData) {
          const openTagName = tagData.tagName;
          if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
            openTagCount++;
          }
          i = tagData.closeIndex;
        } else {
          lenient = true;
          if (nextGt < i) {
            nextGt = xmlData.indexOf(">", i);
            if (nextGt === -1) return;
          }
          const nextLt = xmlData.indexOf("<", i + 1);
          if (nextLt === -1 || nextLt > nextGt) {
            const exp = xmlData.substring(i + 1, nextGt);
            const sep2 = exp.search(/\s/);
            const name = sep2 === -1 ? exp : exp.substring(0, sep2);
            if (name === tagName && exp[exp.length - 1] !== "/") openTagCount++;
            i = nextGt;
          }
        }
      }
    }
  }
}
function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === "string") {
    const newval = val.trim();
    if (newval === "true") return true;
    else if (newval === "false") return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return "";
    }
  }
}
function transformTagName(fn, tagName, tagExp, options) {
  if (fn) {
    const newTagName = fn(tagName);
    if (tagExp === tagName) {
      tagExp = newTagName;
    }
    tagName = newTagName;
  }
  tagName = sanitizeName(tagName, options);
  return { tagName, tagExp };
}
function sanitizeName(name, options) {
  if (criticalProperties.includes(name)) {
    throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
  } else if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return options.onDangerousProperty(name);
  }
  return name;
}

// node_modules/fast-xml-parser/src/xmlparser/node2json.js
var METADATA_SYMBOL2 = XmlNode.getMetaDataSymbol();
function stripAttributePrefix(attrs2, prefix) {
  if (!attrs2 || typeof attrs2 !== "object") return {};
  if (!prefix) return attrs2;
  const rawAttrs = {};
  for (const key in attrs2) {
    if (key.startsWith(prefix)) {
      const rawName = key.substring(prefix.length);
      rawAttrs[rawName] = attrs2[key];
    } else {
      rawAttrs[key] = attrs2[key];
    }
  }
  return rawAttrs;
}
function prettify(node, options, matcher, readonlyMatcher) {
  return compress(node, options, matcher, readonlyMatcher);
}
function compress(arr, options, matcher, readonlyMatcher) {
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName(tagObj);
    if (property !== void 0 && property !== options.textNodeName) {
      const rawAttrs = stripAttributePrefix(
        tagObj[":@"] || {},
        options.attributeNamePrefix
      );
      matcher.push(property, rawAttrs);
    }
    if (property === options.textNodeName) {
      if (text === void 0) text = tagObj[property];
      else text += "" + tagObj[property];
    } else if (property === void 0) {
      continue;
    } else if (tagObj[property]) {
      let val = compress(tagObj[property], options, matcher, readonlyMatcher);
      const isLeaf = isLeafTag(val, options);
      if (Object.keys(val).length === 0 && options.alwaysCreateTextNode) {
        val[options.textNodeName] = "";
      }
      if (tagObj[":@"]) {
        assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
      } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
        val = val[options.textNodeName];
      } else if (Object.keys(val).length === 0) {
        if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }
      if (tagObj[METADATA_SYMBOL2] !== void 0 && typeof val === "object" && val !== null) {
        val[METADATA_SYMBOL2] = tagObj[METADATA_SYMBOL2];
      }
      if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
        if (!Array.isArray(compressedObj[property])) {
          compressedObj[property] = [compressedObj[property]];
        }
        compressedObj[property].push(val);
      } else {
        const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
        if (options.isArray(property, jPathOrMatcher, isLeaf)) {
          compressedObj[property] = [val];
        } else {
          compressedObj[property] = val;
        }
      }
      if (property !== void 0 && property !== options.textNodeName) {
        matcher.pop();
      }
    }
  }
  if (typeof text === "string") {
    if (text.length > 0) compressedObj[options.textNodeName] = text;
  } else if (text !== void 0) compressedObj[options.textNodeName] = text;
  return compressedObj;
}
function propName(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== ":@") return key;
  }
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
      const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
      if (options.isArray(atrrName, jPathOrMatcher, true, true)) {
        obj[atrrName] = [attrMap[atrrName]];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}
function isLeafTag(obj, options) {
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  if (propCount === 0) {
    return true;
  }
  if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
    return true;
  }
  return false;
}

// node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
  constructor(options) {
    this.externalEntities = {};
    this.options = buildOptions(options);
  }
  /**
   * Parse XML dats to JS object 
   * @param {string|Uint8Array} xmlData 
   * @param {boolean|Object} validationOption 
   */
  parse(xmlData, validationOption) {
    if (typeof xmlData !== "string" && xmlData.toString) {
      if (xmlData instanceof Uint8Array && !(typeof Buffer !== "undefined" && Buffer.isBuffer(xmlData))) {
        xmlData = new TextDecoder("utf-8", { ignoreBOM: true }).decode(xmlData);
      } else {
        xmlData = xmlData.toString();
      }
    } else if (typeof xmlData !== "string") {
      throw new Error("XML data is accepted in String or Bytes[] form.");
    }
    if (validationOption) {
      if (validationOption === true) validationOption = {};
      const result = validate(xmlData, validationOption);
      if (result !== true) {
        throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
      }
    }
    const orderedObjParser = new OrderedObjParser(this.options, this.externalEntities);
    const orderedResult = orderedObjParser.parseXml(xmlData);
    if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
    else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
  }
  /**
   * Add Entity which is not by default supported by this library
   * @param {string} key 
   * @param {string} value 
   */
  addEntity(key, value) {
    if (value.indexOf("&") !== -1) {
      throw new Error("Entity value can't have '&'");
    } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
      throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    } else if (value === "&") {
      throw new Error("An entity with value '&' is not permitted");
    } else {
      this.externalEntities[key] = value;
    }
  }
  /**
   * Returns a Symbol that can be used to access the metadata
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when `captureMetaData`
   * is true in the options.
   */
  static getMetaDataSymbol() {
    return XmlNode.getMetaDataSymbol();
  }
};

// node_modules/fast-xml-parser/src/fxp.js
var XMLValidator = {
  validate
};

// src/worker/svg.ts
var elements = new Set("svg g defs title desc path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask pattern use symbol".split(" "));
var attrs = new Set("xmlns width height viewBox preserveAspectRatio id x y x1 y1 x2 y2 cx cy r rx ry d points transform opacity fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset clip-path clip-rule mask gradientUnits gradientTransform offset stop-color stop-opacity font-family font-size font-weight text-anchor dominant-baseline href xlink:href xmlns:xlink patternUnits patternContentUnits".split(" "));
var escape2 = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function sanitizeSvg(source) {
  if (source.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source) || XMLValidator.validate(source) !== true) throw new Error("Unsafe or invalid SVG");
  const tree = new XMLParser({ preserveOrder: true, ignoreAttributes: false, parseTagValue: false, processEntities: false }).parse(source);
  if (!tree.some((n) => "svg" in n)) throw new Error("Not an SVG document");
  let count = 0;
  function nodes(list, depth = 0) {
    if (depth > 64) throw new Error("SVG nesting limit exceeded");
    return list.map((n) => {
      if (++count > 25e3) throw new Error("SVG complexity limit exceeded");
      if ("#text" in n) return escape2(String(n["#text"]));
      const tag = Object.keys(n).find((k) => k !== ":@");
      if (!tag || !elements.has(tag)) return "";
      const a = n[":@"] ?? {};
      const properties = Object.entries(a).flatMap(([key, v]) => {
        const k = key.replace(/^@_/, ""), value = String(v);
        if (!attrs.has(k) || k.endsWith("href") && !/^#[\w.-]+$/.test(value)) return [];
        if (/url\(/i.test(value) && !/^url\(\s*#[\w.-]+\s*\)$/.test(value)) return [];
        if (/javascript:|data:|https?:|file:|expression\(|@import/i.test(value) && !k.startsWith("xmlns")) return [];
        if (k === "xmlns" && value !== "http://www.w3.org/2000/svg") return [];
        if (k === "xmlns:xlink" && value !== "http://www.w3.org/1999/xlink") return [];
        return [" " + k + '="' + escape2(value) + '"'];
      }).join("");
      return "<" + tag + properties + ">" + nodes(n[tag] ?? [], depth + 1) + "</" + tag + ">";
    }).join("");
  }
  return nodes(tree);
}

// src/worker/metadata-extractor.ts
init_workspace_resolver();
async function readAsset(root, file, maxBytes) {
  const canonical = await safePath(root, file);
  const handle = await open(canonical, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const s = await handle.stat();
    if (!s.isFile() || s.size > maxBytes || s.size === 0) throw new Error("File is empty, unsupported or above the size limit");
    const bytes = await handle.readFile(), after = await handle.stat();
    if (after.size !== s.size || after.mtimeMs !== s.mtimeMs || bytes.length !== s.size) throw new Error("File is still being written");
    if (await safePath(root, file) !== canonical) throw new Error("Path changed while reading");
    return { bytes, mtime: s.mtimeMs, birthtime: s.birthtimeMs, size: s.size };
  } finally {
    await handle.close();
  }
}
function validatedInput(bytes) {
  const lead = bytes.subarray(0, 2048).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if (lead.startsWith("<svg") || lead.startsWith("<?xml") || lead.startsWith("<!--")) return Buffer.from(sanitizeSvg(bytes.toString("utf8")));
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const gif = /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  const webp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  const avif = bytes.subarray(4, 8).toString() === "ftyp" && /avif|avis/.test(bytes.subarray(8, 64).toString());
  if (!png && !jpg && !gif && !webp && !avif) throw new Error("Unsupported file signature");
  return bytes;
}
function imageMetadata(input) {
  const metadata = imageSize(input), mimes = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", heif: "image/avif", svg: "image/svg+xml" };
  const mimeType = mimes[metadata.type ?? ""];
  if (!mimeType || !Number.isFinite(metadata.width) || !Number.isFinite(metadata.height) || metadata.width < 1 || metadata.height < 1 || metadata.width * metadata.height > 4e7) throw new Error("Invalid or oversized image dimensions");
  return { mimeType, width: metadata.width, height: metadata.height, animated: metadata.type === "gif" };
}
async function extract(root, file, maxBytes) {
  const data = await readAsset(root, file, maxBytes), contentHash = createHash2("sha256").update(data.bytes).digest("hex");
  if ([".md", ".markdown"].includes(path2.extname(file).toLowerCase())) {
    const text = validateMarkdown(data.bytes);
    return { ...data, mimeType: "text/markdown", width: void 0, height: void 0, animated: false, contentHash, thumbnail: markdownThumbnail(text), thumbnailMime: "image/svg+xml" };
  }
  if ([".html", ".htm"].includes(path2.extname(file).toLowerCase())) {
    const text = validateHtml(data.bytes);
    return { ...data, mimeType: "text/html", width: void 0, height: void 0, animated: false, contentHash, thumbnail: htmlThumbnail(text), thumbnailMime: "image/svg+xml" };
  }
  if ([".mp4", ".webm"].includes(path2.extname(file).toLowerCase())) return { ...data, ...videoMetadata(data.bytes, path2.extname(file).toLowerCase()), width: void 0, height: void 0, animated: false, contentHash, thumbnail: void 0, thumbnailMime: void 0 };
  const input = validatedInput(data.bytes), metadata = imageMetadata(input);
  return { ...data, ...metadata, contentHash, thumbnail: void 0, thumbnailMime: void 0 };
}

// src/worker/asset-index.ts
var AssetIndex = class {
  constructor(persistence, thumbnails, changed) {
    this.persistence = persistence;
    this.thumbnails = thumbnails;
    this.changed = changed;
  }
  records = /* @__PURE__ */ new Map();
  revision = 0;
  paths = /* @__PURE__ */ new Map();
  id(w, file) {
    const key = assetPathKey(path3.resolve(w.root, file));
    return this.paths.get(key) ?? stableId(key);
  }
  restore(a) {
    const key = assetPathKey(a.absolutePath), id = this.paths.get(key), old = id ? this.records.get(id) : void 0, merged = old ? mergeAssetRecords(old, a) : a;
    if (old) {
      for (const obsolete of [old.id, a.id]) if (obsolete !== merged.id) {
        this.records.delete(obsolete);
        this.persistence.remove(obsolete);
      }
      this.persistence.put(merged);
    }
    this.paths.set(key, merged.id);
    if (merged.originalPath) this.paths.set(assetPathKey(merged.originalPath), merged.id);
    this.records.set(merged.id, merged);
  }
  async relocate(w, asset, file, maxBytes) {
    const canonical = await safePath(w.root, file), result = await extract(w.root, canonical, maxBytes);
    if (!asset.contentHash || asset.contentHash !== result.contentHash) throw new Error("Relocated asset content does not match its indexed original");
    this.paths.delete(assetPathKey(asset.absolutePath));
    const moved = { ...asset, absolutePath: canonical, relativePath: path3.relative(w.root, canonical), status: "missing" };
    this.restore(moved);
    return this.ingest(w, canonical, asset.origin, maxBytes);
  }
  async ingest(w, file, origin, maxBytes, event, source, original) {
    const root = original ? w.root : source?.root ?? w.root;
    const result = await extract(root, file, maxBytes), canonical = await Promise.resolve().then(() => (init_workspace_resolver(), workspace_resolver_exports)).then((m) => m.safePath(root, file));
    const id = this.id(w, original?.path ?? canonical), old = this.records.get(id);
    if (!old && this.records.size >= MAX_ASSETS) throw new Error("Asset index limit reached (20,000 files)");
    const nextOrigin = origin === "confirmed-agent" ? origin : old?.origin === "confirmed-agent" ? old.origin : origin === "chat-output" ? origin : origin === "inferred-agent" ? origin : old?.origin ?? origin;
    const changed = !!old && old.contentHash !== result.contentHash;
    const a = { ...old, id, projectId: w.libraryProjectId, worktreeId: w.id, worktreeName: w.name, absolutePath: canonical, relativePath: path3.relative(root, canonical), filename: path3.basename(canonical), extension: path3.extname(canonical).slice(1).toLowerCase(), mimeType: result.mimeType, sizeBytes: result.size, width: result.width, height: result.height, animated: result.animated, createdAt: old?.createdAt ?? result.birthtime, updatedAt: result.mtime, origin: nextOrigin, contentHash: result.contentHash, version: old ? old.version + (changed ? 1 : 0) : 1, status: changed ? "modified" : "available", previewCacheKey: result.contentHash, ...source ? { location: "chat", sourceRoot: source.root, conversationId: source.conversationId, orcaTabId: source.orcaTabId, agent: source.agent } : {}, ...original ? { originalPath: original.path, originalContentHash: original.contentHash, originalUpdatedAt: original.updatedAt, originalSizeBytes: original.sizeBytes } : {} };
    if (!original && (source || canonical === old?.originalPath)) {
      delete a.originalPath;
      delete a.originalContentHash;
      delete a.originalUpdatedAt;
      delete a.originalSizeBytes;
    }
    if (origin === "confirmed-agent" && event) {
      a.agent = event.agent;
      a.tool = event.tool;
      if (event.conversationId) a.conversationId = event.conversationId;
      if (event.orcaTabId) a.orcaTabId = event.orcaTabId;
    }
    if (old?.absolutePath === a.absolutePath && old.originalUpdatedAt === a.originalUpdatedAt && old.originalContentHash === a.originalContentHash && old.contentHash === a.contentHash && old.updatedAt === a.updatedAt && old.sizeBytes === a.sizeBytes && old.status !== "missing" && old.origin === a.origin && old.worktreeId === a.worktreeId && old.projectId === a.projectId) {
      if (result.thumbnail && !await this.thumbnails.get(a.contentHash)) await this.thumbnails.put(a.contentHash, result.thumbnail, result.thumbnailMime);
      return old;
    }
    if (old && old.absolutePath !== canonical && this.paths.get(assetPathKey(old.absolutePath)) === id) this.paths.delete(assetPathKey(old.absolutePath));
    this.paths.set(assetPathKey(canonical), id);
    if (a.originalPath) this.paths.set(assetPathKey(a.originalPath), id);
    this.records.set(id, a);
    this.persistence.put(a);
    this.revision++;
    this.changed();
    if (result.thumbnail) await this.thumbnails.put(result.contentHash, result.thumbnail, result.thumbnailMime);
    return a;
  }
  missing(id) {
    const a = this.records.get(id);
    if (a && a.status !== "missing") {
      a.status = "missing";
      this.persistence.put(a);
      this.revision++;
      this.changed();
    }
  }
};

// src/worker/file-watcher.ts
import { watch } from "node:fs";
import { readdir, stat as stat2 } from "node:fs/promises";
import path4 from "node:path";
function excluded(relative, custom = []) {
  const parts = relative.split(/[\/\\]/);
  if (parts.some((p) => EXCLUDED.has(p))) return true;
  return custom.some((p) => relative === p || relative.startsWith(p.replace(/[\/\\]$/, "") + path4.sep));
}
function supported(file, extensions = EXTENSIONS) {
  return extensions.includes(path4.extname(file).slice(1).toLowerCase()) && !/(?:\.tmp|\.temp|~)$/.test(file);
}
var FileWatcher = class {
  constructor(change, error, custom) {
    this.change = change;
    this.error = error;
    this.custom = custom;
  }
  watchers = /* @__PURE__ */ new Map();
  directories = /* @__PURE__ */ new Set();
  stopped = false;
  warned = false;
  contexts = /* @__PURE__ */ new Map();
  async sync(workspaces) {
    this.stopped = false;
    const roots = workspaces.filter((w) => w.root && !w.reason).slice(0, 24), ids = new Set(roots.map((w) => w.id));
    for (const [id, list] of this.watchers) if (!ids.has(id) || this.contexts.get(id)?.root !== roots.find((w) => w.id === id)?.root) {
      for (const watcher of list) watcher.close();
      this.watchers.delete(id);
    }
    this.contexts = new Map(roots.map((w) => [w.id, w]));
    for (const w of roots) if (!this.watchers.has(w.id)) {
      this.watchers.set(w.id, []);
      if (process.platform === "darwin" || process.platform === "win32") {
        try {
          const watcher = watch(w.root, { recursive: true }, (_, filename) => {
            if (filename) this.event(w, path4.join(w.root, filename.toString()));
          });
          watcher.on("error", (e) => {
            watcher.close();
            this.error(e);
          });
          this.watchers.get(w.id).push(watcher);
        } catch (e) {
          this.error(e);
        }
      } else await this.directory(w, w.root, 0);
    }
  }
  event(w, file) {
    const current = this.contexts.get(w.id);
    if (!current || current.root !== w.root) return;
    w = current;
    if (this.stopped || excluded(path4.relative(w.root, file), this.custom())) return;
    if (supported(file)) void stat2(file).then(() => this.change(w, file, false), () => this.change(w, file, true));
    else if (process.platform !== "darwin" && process.platform !== "win32") void stat2(file).then((s) => {
      if (s.isDirectory()) void this.directory(w, file, path4.relative(w.root, file).split(path4.sep).length);
    }).catch(() => {
    });
  }
  async directory(w, folder, depth) {
    if (this.stopped || depth > 16 || this.directories.has(folder) || excluded(path4.relative(w.root, folder), this.custom())) return;
    if (this.directories.size >= 128) {
      if (!this.warned) {
        this.warned = true;
        this.error(new Error("Directory watcher limit reached; explicit tool evidence still collects assets. Use discovery for unwatched folders."));
      }
      return;
    }
    this.directories.add(folder);
    try {
      const watcher = watch(folder, (_, filename) => {
        if (filename) this.event(w, path4.join(folder, filename.toString()));
      });
      watcher.on("error", (e) => {
        watcher.close();
        this.error(e);
      });
      this.watchers.get(w.id)?.push(watcher);
      for (const entry of await readdir(folder, { withFileTypes: true })) if (entry.isDirectory() && !entry.isSymbolicLink()) await this.directory(w, path4.join(folder, entry.name), depth + 1);
    } catch (e) {
      this.error(e);
    }
  }
  async close() {
    this.stopped = true;
    for (const list of this.watchers.values()) for (const watcher of list) watcher.close();
    this.watchers.clear();
    this.directories.clear();
    this.contexts.clear();
  }
};

// src/worker/persistence.ts
import { createHash as createHash3 } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
var SHARDS = 64;
var FORMAT = "asset-shard-v2";
var bucket = (id) => createHash3("sha256").update(id).digest()[0] % SHARDS;
var valid = (v) => !!v && typeof v === "object" && !Array.isArray(v) && typeof v.id === "string" && typeof v.absolutePath === "string" && typeof v.contentHash === "string" && ["confirmed-agent", "chat-output", "inferred-agent", "discovered"].includes(v.origin);
function unpack(v) {
  if (valid(v)) return [v];
  if (v && typeof v === "object" && !Array.isArray(v) && "format" in v && v.format === FORMAT && "data" in v && typeof v.data === "string") {
    const rows = JSON.parse(gunzipSync(Buffer.from(v.data, "base64"), { maxOutputLength: 32 * 1024 * 1024 }).toString("utf8"));
    if (Array.isArray(rows) && rows.every(valid)) return rows;
    throw new Error("Invalid saved asset shard");
  }
  return [];
}
function pack(rows) {
  const value = { format: FORMAT, data: gzipSync(Buffer.from(JSON.stringify(rows))).toString("base64") };
  if (Buffer.byteLength(JSON.stringify(value)) > 256 * 1024) throw new Error("Asset metadata exceeds Orca\u2019s storage value limit");
  return value;
}
var Persistence = class {
  constructor(storage, report) {
    this.storage = storage;
    this.report = report;
  }
  records = /* @__PURE__ */ new Map();
  dirty = /* @__PURE__ */ new Map();
  removed = /* @__PURE__ */ new Set();
  timer;
  chain = Promise.resolve();
  async load() {
    const keys = await this.storage.keys(), legacy = keys.filter((k) => k.startsWith("asset.v1.")), current = keys.filter((k) => k.startsWith("asset.v2."));
    const legacyGroups = /* @__PURE__ */ new Map();
    const assetKeys = [...legacy, ...current];
    for (let offset = 0; offset < assetKeys.length; offset += 16) {
      const chunk = assetKeys.slice(offset, offset + 16), values = await Promise.all(chunk.map((key) => this.storage.get(key)));
      for (const [i, key] of chunk.entries()) {
        const rows = unpack(values[i]);
        for (const a of rows) {
          if (this.records.size < 2e4 || this.records.has(a.id)) this.records.set(a.id, a);
        }
        if (key.startsWith("asset.v1.") && rows.length) {
          const shard = bucket(rows[0].id);
          legacyGroups.set(shard, [...legacyGroups.get(shard) ?? [], key]);
        }
      }
    }
    for (const [shard, oldKeys] of [...legacyGroups].sort((a, b) => b[1].length - a[1].length)) {
      const rows = [...this.records.values()].filter((a) => bucket(a.id) === shard), value = pack(rows), stage = oldKeys[0];
      try {
        await this.storage.set(stage, value);
        for (let i = 1; i < oldKeys.length; i += 16) await Promise.all(oldKeys.slice(i, i + 16).map((key) => this.storage.delete(key)));
        await this.storage.set("asset.v2." + shard, value);
        await this.storage.delete(stage);
      } catch (e) {
        this.report(e);
      }
    }
    return [...this.records.values()];
  }
  remove(id) {
    this.dirty.delete(id);
    this.removed.add(id);
    this.arm();
  }
  arm() {
    if (!this.timer) this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.flush().catch(this.report);
    }, 400);
  }
  put(a) {
    this.removed.delete(a.id);
    this.dirty.set(a.id, a);
    this.arm();
  }
  flush() {
    const batch = [...this.dirty.values()].map((a) => JSON.parse(JSON.stringify(a)));
    this.dirty.clear();
    const removed = [...this.removed];
    this.removed.clear();
    this.chain = this.chain.catch(() => {
    }).then(async () => {
      const groups = /* @__PURE__ */ new Map();
      for (const a of batch) {
        const shard = bucket(a.id);
        groups.set(shard, [...groups.get(shard) ?? [], a]);
      }
      for (const id of removed) if (!groups.has(bucket(id))) groups.set(bucket(id), []);
      for (const [shard, updates] of groups) {
        const merged = new Map([...this.records.values()].filter((a) => bucket(a.id) === shard).map((a) => [a.id, a]));
        for (const id of removed) merged.delete(id);
        for (const a of updates) merged.set(a.id, a);
        try {
          await this.storage.set("asset.v2." + shard, pack([...merged.values()]));
          for (const id of removed) if (bucket(id) === shard) this.records.delete(id);
          for (const a of updates) this.records.set(a.id, a);
        } catch (e) {
          for (const id of removed) if (!this.dirty.has(id)) this.removed.add(id);
          for (const remaining of [...groups.values()].flat()) if (!this.dirty.has(remaining.id)) this.dirty.set(remaining.id, remaining);
          throw e;
        }
      }
    });
    return this.chain;
  }
  async close() {
    clearTimeout(this.timer);
    await this.flush();
  }
};

// src/worker/thumbnail-service.ts
var MAX_CACHE_BYTES = 1024 * 1024;
var MAX_CACHE_KEYS = 128;
var ThumbnailService = class {
  constructor(storage) {
    this.storage = storage;
  }
  memory = /* @__PURE__ */ new Map();
  order = [];
  sizes = /* @__PURE__ */ new Map();
  chain = Promise.resolve();
  async init() {
    const v = await this.storage.get("thumbnail.order.v1");
    this.order = Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string"))] : [];
    const retained = new Set(this.order), obsolete = (await this.storage.keys()).filter((key) => key.startsWith("thumb.v1.") && !retained.has(key.slice(9)));
    for (let i = 0; i < obsolete.length; i += 16) await Promise.all(obsolete.slice(i, i + 16).map((key) => this.storage.delete(key)));
    for (let i = 0; i < this.order.length; i += 16) {
      const keys = this.order.slice(i, i + 16), values = await Promise.all(keys.map((key) => this.storage.get("thumb.v1." + key)));
      for (const [j, key] of keys.entries()) if (typeof values[j] === "string") this.sizes.set(key, Buffer.byteLength(values[j]));
    }
    this.order = this.order.filter((key) => this.sizes.has(key));
    await this.trim();
    if (Array.isArray(v) || this.order.length) await this.storage.set("thumbnail.order.v1", this.order);
  }
  async get(key) {
    const m = this.memory.get(key);
    if (m) return m;
    const v = await this.storage.get("thumb.v1." + key);
    if (typeof v === "string") {
      this.remember(key, v);
      return v;
    }
    return null;
  }
  remember(key, data) {
    this.memory.delete(key);
    this.memory.set(key, data);
    if (this.memory.size > 80) this.memory.delete(this.memory.keys().next().value);
  }
  async trim() {
    while (this.order.length > MAX_CACHE_KEYS || [...this.sizes.values()].reduce((n, v) => n + v, 0) > MAX_CACHE_BYTES) {
      const oldest = this.order.shift();
      await this.storage.delete("thumb.v1." + oldest);
      this.sizes.delete(oldest);
    }
  }
  put(key, bytes, mimeType = "image/webp") {
    if (bytes.length > 144 * 1024) return Promise.resolve();
    const data = "data:" + mimeType + ";base64," + bytes.toString("base64");
    const task = this.chain.catch(() => {
    }).then(async () => {
      this.order = this.order.filter((k) => k !== key);
      this.order.push(key);
      this.sizes.set(key, Buffer.byteLength(data));
      await this.trim();
      await this.storage.set("thumb.v1." + key, data);
      await this.storage.set("thumbnail.order.v1", this.order);
      this.remember(key, data);
    });
    this.chain = task;
    return task;
  }
};

// src/worker/workspace-reconciler.ts
init_workspace_resolver();
import { stat as stat3 } from "node:fs/promises";
async function reconcileWorkspace(workspaces, records, settings, signal, ingest, missing, report = () => {
}) {
  const roots = new Map(workspaces.filter((w) => w.root && !w.reason).map((w) => [w.id, w]));
  for (const asset of records) {
    if (signal.aborted) return;
    if (asset.location === "chat" && !asset.originalPath || !["confirmed-agent", "chat-output"].includes(asset.origin)) continue;
    const w = roots.get(asset.worktreeId);
    if (!w?.root) continue;
    let s;
    try {
      s = await stat3(await safePath(w.root, asset.absolutePath));
    } catch {
      if (!signal.aborted) missing(asset.id);
      continue;
    }
    if (!s.isFile()) {
      missing(asset.id);
      continue;
    }
    if (asset.status === "missing" || asset.updatedAt !== s.mtimeMs || asset.sizeBytes !== s.size) {
      try {
        await ingest(w, asset.absolutePath, asset.origin);
      } catch (error) {
        report(error);
      }
    }
  }
}

// src/worker/native-workspace-adapter.ts
import { execFile as execFile2 } from "node:child_process";
import { promisify as promisify2 } from "node:util";
import { homedir } from "node:os";
import path5 from "node:path";
var execute2 = promisify2(execFile2);
var object2 = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
function defaultOrcaDataDirectory() {
  const scratch = process.env.ORCA_CHAT_SCRATCH_DIR;
  if (scratch && /^[a-f0-9]{32}$/.test(path5.basename(scratch))) return path5.dirname(path5.dirname(scratch));
  const config = process.platform === "darwin" ? path5.join(homedir(), "Library", "Application Support") : process.platform === "win32" ? process.env.APPDATA ?? path5.join(homedir(), "AppData", "Roaming") : process.env.XDG_CONFIG_HOME ?? path5.join(homedir(), ".config");
  return path5.join(config, "orca");
}
async function inventory() {
  const cli = process.env.ORCA_CLI_COMMAND || (process.env.ORCA_DEV_REPO_ROOT ? "orca-dev" : process.platform === "linux" ? "orca-ide" : "orca");
  const [worktrees, projects] = await Promise.allSettled([
    execute2(cli, ["worktree", "ps", "--limit", "500", "--environment", "local", "--json"], { timeout: 6e3, maxBuffer: 8 * 1024 * 1024 }),
    execute2(cli, ["project", "list", "--environment", "local", "--json"], { timeout: 6e3, maxBuffer: 2 * 1024 * 1024 })
  ]);
  if (worktrees.status === "rejected") throw worktrees.reason;
  const response = JSON.parse(worktrees.value.stdout.slice(worktrees.value.stdout.indexOf("{")));
  if (projects.status === "fulfilled") try {
    const metadata = JSON.parse(projects.value.stdout.slice(projects.value.stdout.indexOf("{")));
    if (metadata.ok === true && Array.isArray(metadata.result?.projects) && object2(response.result)) response.result.projects = metadata.result.projects;
  } catch {
  }
  return response;
}
function projectAppearances(values) {
  const byRepo = /* @__PURE__ */ new Map();
  if (!Array.isArray(values)) return byRepo;
  for (const value of values.slice(0, 500)) {
    const project = object2(value);
    if (!project || !Array.isArray(project.sourceRepoIds)) continue;
    const appearance = {}, configuredIcon = object2(project.repoIcon);
    if (typeof project.badgeColor === "string" && /^#[a-f0-9]{6}$/i.test(project.badgeColor)) appearance.color = project.badgeColor;
    if (configuredIcon?.type === "lucide" && typeof configuredIcon.name === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(configuredIcon.name)) appearance.iconName = configuredIcon.name;
    for (const id of new Set(project.sourceRepoIds.slice(0, 32))) if (typeof id === "string" && id.length <= 200) byRepo.set(id, byRepo.has(id) ? null : appearance);
  }
  return byRepo;
}
var NativeWorkspaceAdapter = class {
  constructor(readInventory = inventory) {
    this.readInventory = readInventory;
  }
  aliases = /* @__PURE__ */ new Map();
  activeWorkspaceId;
  activities = [];
  async sync(workspaces) {
    this.aliases.clear();
    this.activities = [];
    this.activeWorkspaceId = void 0;
    for (const w of workspaces) delete w.projectAppearance;
    const response = object2(await this.readInventory()), result = object2(response?.result);
    if (response?.ok !== true || !result || !Array.isArray(result.worktrees)) throw new Error("Orca CLI workspace inventory is unavailable.");
    const rows = result.worktrees.slice(0, 500), paths = /* @__PURE__ */ new Map(), appearances = projectAppearances(result.projects);
    for (const value of rows) {
      const row = object2(value);
      if (row?.hostId === "local" && typeof row.path === "string") paths.set(row.path, (paths.get(row.path) ?? 0) + 1);
    }
    let active;
    for (const value of rows) {
      const row = object2(value), address = object2(row?.address);
      if (!row || row.hostId !== "local" || address?.environment !== "local" || typeof address.worktree !== "string" || typeof row.path !== "string") continue;
      const matches = workspaces.filter((w2) => w2.root && !w2.reason && (w2.hostId === null || w2.hostId === "local") && w2.path === row.path);
      if (matches.length !== 1 || paths.get(row.path) !== 1) continue;
      const w = matches[0];
      const appearance = typeof row.repoId === "string" ? appearances.get(row.repoId) : void 0;
      if (appearance && (appearance.color || appearance.iconName)) w.projectAppearance = { ...appearance };
      if (typeof row.worktreeId === "string") this.aliases.set(row.worktreeId, w.id);
      if (row.isActive === true) active = active === void 0 ? w.id : "";
      if (!Array.isArray(row.agents)) continue;
      for (const value2 of row.agents) {
        const agent = object2(value2);
        if (!agent || typeof agent.paneKey !== "string" || !/^structured-agent-session-[A-Za-z0-9_-]{1,200}:[A-Za-z0-9-]{1,100}$/.test(agent.paneKey)) continue;
        const status = object2(agent.mainAgent) ?? agent;
        if (typeof status.state === "string" && ["working", "blocked", "waiting", "done"].includes(status.state) && typeof status.stateStartedAt === "number" && Number.isFinite(status.stateStartedAt)) this.activities.push({ workspaceId: w.id, paneKey: agent.paneKey, state: status.state, startedAt: status.stateStartedAt });
      }
    }
    this.activeWorkspaceId = active || void 0;
    return result.truncated === true ? "Orca CLI truncated workspace inventory; some session mappings may be unavailable." : void 0;
  }
};

// src/worker/asset-path-migration.ts
init_workspace_resolver();
import path6 from "node:path";
import { stat as stat4 } from "node:fs/promises";
async function repairRenamedPluginPaths(workspaces, index, maxBytes) {
  for (const asset of [...index.records.values()]) {
    if (asset.location === "chat" || asset.origin !== "confirmed-agent") continue;
    const w = workspaces.find((w2) => w2.id === asset.worktreeId);
    if (!w?.root || w.reason) continue;
    const previousRoot = path6.join(w.root, "library");
    if (!within(previousRoot, asset.absolutePath)) continue;
    try {
      await stat4(await safePath(w.root, asset.absolutePath));
      continue;
    } catch {
    }
    const target = path6.join(w.root, "assets-library", path6.relative(previousRoot, asset.absolutePath));
    try {
      await index.relocate(w, asset, target, maxBytes);
    } catch {
    }
  }
}

// src/worker/file-actions.ts
init_workspace_resolver();
import { execFile as execFile3 } from "node:child_process";
import { promisify as promisify3 } from "node:util";
import path7 from "node:path";
import { pathToFileURL } from "node:url";
var execute3 = promisify3(execFile3);
function browserOpener(run = execute3) {
  return async (file, w) => {
    const cli = process.env.ORCA_CLI_COMMAND || (process.env.ORCA_DEV_REPO_ROOT ? "orca-dev" : process.platform === "linux" ? "orca-ide" : "orca");
    const { stdout } = await run(cli, ["tab", "create", "--url", pathToFileURL(file).href, "--worktree", "path:" + w.root, "--environment", "local", "--json"], { timeout: 1e4, maxBuffer: 32768 });
    const response = JSON.parse(stdout.slice(stdout.indexOf("{")));
    if (response.ok !== true || typeof response.result?.browserPageId !== "string") throw new Error(response.error?.message ?? "Orca did not open the browser tab");
    const switched = await run(cli, ["tab", "switch", "--page", response.result.browserPageId, "--worktree", "path:" + w.root, "--environment", "local", "--json"], { timeout: 1e4, maxBuffer: 32768 });
    const state = JSON.parse(switched.stdout.slice(switched.stdout.indexOf("{")));
    if (state.ok !== true) throw new Error(state.error?.message ?? "Orca could not show the asset tab");
  };
}
async function openOriginal(asset, w, editor, browser = browserOpener(), copy, preferred) {
  const sourceRoot = asset.location === "chat" && !asset.originalPath ? asset.sourceRoot : w.root;
  if (!w.root || !sourceRoot || !path7.isAbsolute(asset.absolutePath) || !within(sourceRoot, asset.absolutePath)) throw new Error("The original is outside the current worktree or its owned chat folder.");
  const target = preferred ?? asset;
  if (preferred && (!path7.isAbsolute(preferred.absolutePath) || !within(w.root, preferred.absolutePath))) throw new Error("The matching file is outside the current worktree.");
  const edit = async (file) => {
    const result = await editor({ workspaceId: w.id, path: path7.relative(w.root, file) });
    if (result && typeof result === "object" && "opened" in result && result.opened !== true) throw new Error("Orca did not open the file");
  };
  try {
    if (!within(w.root, target.absolutePath)) throw new Error("Orca\u2019s editor requires a file inside the worktree");
    if (target.mimeType === "text/html" && !target.originalPath) await browser(target.absolutePath, w);
    else await edit(target.absolutePath);
    return target.originalPath ? { workingCopy: target.absolutePath } : void 0;
  } catch (originalError) {
    if (!copy || target.originalPath) throw originalError;
    try {
      const file = await copy(target, w);
      if (!path7.isAbsolute(file) || !within(w.root, file)) throw new Error("Working copy is outside the worktree");
      await edit(file);
      return { workingCopy: file };
    } catch (e) {
      throw new Error("Original could not open: " + (originalError instanceof Error ? originalError.message : String(originalError)) + ". Working copy could not open: " + (e instanceof Error ? e.message : String(e)));
    }
  }
}

// src/worker/editor-copies.ts
import path8 from "node:path";
import { mkdir, lstat, realpath as realpath2, open as open2, rename, unlink } from "node:fs/promises";
import { constants as constants2 } from "node:fs";
import { createHash as createHash4, randomUUID } from "node:crypto";
init_workspace_resolver();
var EditorCopies = class {
  constructor(storage) {
    this.storage = storage;
  }
  records = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  initialized;
  saves = Promise.resolve();
  init() {
    return this.initialized ??= (async () => {
      const value = await this.storage.get("editor.copies.v1");
      if (Array.isArray(value)) for (const entry of value.slice(-1e3)) {
        if (entry && typeof entry === "object" && !Array.isArray(entry) && "id" in entry && typeof entry.id === "string" && "sourceHash" in entry && typeof entry.sourceHash === "string" && "copyPath" in entry && typeof entry.copyPath === "string") this.records.set(entry.id, { sourceHash: entry.sourceHash, copyPath: entry.copyPath });
      }
    })();
  }
  async materialize(w, a, maxBytes) {
    await this.init();
    const sourceRoot = a.location === "chat" ? a.sourceRoot : w.root;
    if (!w.root || !sourceRoot || !within(sourceRoot, a.absolutePath) || a.originalPath || a.location === "chat" && (!a.conversationId || !/^[A-Za-z0-9_-]{1,200}$/.test(a.conversationId))) throw new Error("Invalid working-copy request");
    const key = w.id + ":" + a.id, existing = this.pending.get(key);
    if (existing) return existing;
    const task = this.copy(w, a, key, maxBytes).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }
  async copy(w, a, key, maxBytes) {
    const sourceRoot = a.location === "chat" ? a.sourceRoot : w.root, root = await realpath2(w.root), relative = path8.relative(sourceRoot, a.absolutePath);
    const target = path8.join(root, ".orca", "assets-library", "opened", a.location === "chat" ? a.conversationId : "worktree", relative);
    if (!relative || !within(root, target)) throw new Error("Working copy would leave the worktree");
    const saved = this.records.get(key);
    if (saved?.sourceHash === a.contentHash && saved.copyPath === target || a.originalContentHash === a.contentHash) {
      try {
        const info = await lstat(target);
        if (info.isFile() && !info.isSymbolicLink()) return await safePath(root, target);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    const data = await readAsset(sourceRoot, a.absolutePath, maxBytes), sourceHash = createHash4("sha256").update(data.bytes).digest("hex");
    if (sourceHash !== a.contentHash) throw new Error("Asset changed while preparing its copy; retry after writes settle");
    let folder = root;
    for (const part of path8.relative(root, path8.dirname(target)).split(path8.sep)) {
      folder = path8.join(folder, part);
      await safePath(root, path8.dirname(folder));
      try {
        await mkdir(folder, { mode: 448 });
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
      const info = await lstat(folder);
      if (!info.isDirectory() || info.isSymbolicLink() || !within(root, await realpath2(folder))) throw new Error("Working-copy folder is unsafe");
    }
    let copyHash;
    try {
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("Working-copy destination is unsafe");
      if (info.size === 0 || info.size > maxBytes) return await safePath(root, target);
      const copy = await readAsset(root, target, maxBytes);
      copyHash = createHash4("sha256").update(copy.bytes).digest("hex");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const previous = this.records.get(key);
    const lastWriteHash = previous?.copyPath === target ? previous.sourceHash : a.originalContentHash;
    if (copyHash && copyHash !== sourceHash && copyHash !== lastWriteHash) return await safePath(root, target);
    if (copyHash !== sourceHash) {
      const temporary = path8.join(path8.dirname(target), ".library-copy-" + randomUUID());
      const handle = await open2(temporary, constants2.O_WRONLY | constants2.O_CREAT | constants2.O_EXCL | (constants2.O_NOFOLLOW ?? 0), 384);
      try {
        await handle.writeFile(data.bytes);
        await handle.utimes(new Date(data.mtime), new Date(data.mtime));
        await handle.close();
        await safePath(root, path8.dirname(target));
        await rename(temporary, target);
      } finally {
        await handle.close().catch(() => {
        });
        await unlink(temporary).catch(() => {
        });
      }
    }
    this.records.delete(key);
    this.records.set(key, { sourceHash, copyPath: target });
    const values = () => [...this.records].map(([id, v]) => ({ id, ...v }));
    while (this.records.size > 256 || Buffer.byteLength(JSON.stringify(values())) > 128 * 1024) this.records.delete(this.records.keys().next().value);
    const snapshot = values(), save = this.saves.catch(() => {
    }).then(() => this.storage.set("editor.copies.v1", snapshot));
    this.saves = save;
    await save;
    return await safePath(root, target);
  }
};

// src/worker/native-worktree-adapter.ts
import { execFile as execFile4 } from "node:child_process";
import { promisify as promisify4 } from "node:util";
import path10 from "node:path";
import { lstat as lstat2, realpath as realpath3 } from "node:fs/promises";

// src/shared/chat-source.ts
import { createHash as createHash5 } from "node:crypto";
import path9 from "node:path";
function chatDirectory(dataDirectory, sessionId) {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId)) throw new Error("Invalid chat session identity");
  return path9.join(dataDirectory, "chat-scratch", createHash5("sha256").update(sessionId, "utf8").digest("hex").slice(0, 32));
}

// src/worker/native-worktree-adapter.ts
init_workspace_resolver();
var execute4 = promisify4(execFile4);
var object3 = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
var quote = (v) => "'" + v.replace(/'/g, "''") + "'";
var read = async (database, sql) => {
  const { stdout } = await execute4("sqlite3", ["-readonly", "-json", database, sql], { timeout: 6e3, maxBuffer: 2 * 1024 * 1024 });
  return stdout.trim() ? JSON.parse(stdout) : [];
};
var NativeWorktreeAdapter = class {
  constructor(reader = read, database = path10.join(defaultOrcaDataDirectory(), "agent-session-journal.db")) {
    this.reader = reader;
    this.database = database;
  }
  async sources(w, aliases) {
    if (!w.root || w.reason || w.hostId !== null && w.hostId !== "local") return [];
    const owners = [w.id, ...[...aliases].filter(([, id]) => id === w.id).map(([alias]) => alias)];
    const rows = await this.reader(
      this.database,
      "SELECT session_id,json_extract(record_json,'$.location.workspaceId') AS workspace_id,json_extract(record_json,'$.provider') AS agent FROM agent_session_records WHERE json_extract(record_json,'$.schemaVersion')=2 AND json_extract(record_json,'$.location.executionHostId')='local' AND json_extract(record_json,'$.location.workspaceId') IN (" + owners.map(quote).join(",") + ") LIMIT 501;"
    );
    if (!Array.isArray(rows) || rows.length > 500) throw new Error("Chat ownership metadata is unavailable or exceeds its safe limit.");
    const sources = [], dataDirectory = path10.dirname(this.database), scratch = path10.join(dataDirectory, "chat-scratch");
    let canonicalScratch;
    try {
      if (!(await lstat2(scratch)).isDirectory()) return [];
      canonicalScratch = await realpath3(scratch);
    } catch {
      return [];
    }
    for (const value of rows) {
      const r = object3(value);
      if (!r || typeof r.workspace_id !== "string" || !owners.includes(r.workspace_id) || typeof r.session_id !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(r.session_id)) continue;
      const root = chatDirectory(dataDirectory, r.session_id);
      try {
        if (!(await lstat2(root)).isDirectory()) continue;
        const canonical = await realpath3(root);
        if (path10.dirname(canonical) !== canonicalScratch) continue;
        sources.push({ root: canonical, conversationId: r.session_id, orcaTabId: "structured-agent-session-" + r.session_id, agent: typeof r.agent === "string" ? r.agent : void 0 });
      } catch (e) {
        if (e.code === "ENOENT") sources.push({ root: path10.join(canonicalScratch, path10.basename(root)), conversationId: r.session_id, orcaTabId: "structured-agent-session-" + r.session_id, agent: typeof r.agent === "string" ? r.agent : void 0 });
      }
    }
    return sources;
  }
  async assets(w, aliases) {
    if (!w.root || w.reason || w.hostId !== null && w.hostId !== "local") return [];
    const owners = [w.id, ...[...aliases].filter(([, id]) => id === w.id).map(([alias]) => alias)];
    const sql = [
      "WITH owners AS (SELECT a.session_id,e.generation,",
      "json_extract(a.record_json,'$.location.workspaceId') AS workspace_id,",
      "json_extract(a.record_json,'$.provider') AS agent",
      "FROM agent_session_records a JOIN journal_outcome_epochs e USING(session_id)",
      "WHERE json_extract(a.record_json,'$.schemaVersion')=2",
      "AND json_extract(a.record_json,'$.location.executionHostId')='local'",
      "AND json_extract(a.record_json,'$.location.workspaceId') IN (" + owners.map(quote).join(",") + ")),",
      "latest AS (SELECT o.session_id,o.workspace_id,o.agent,j.value_json,j.deleted,",
      "row_number() OVER(PARTITION BY j.generation,j.entry_key ORDER BY j.seq DESC) AS n",
      "FROM journal_outcomes j JOIN owners o USING(generation) WHERE j.field='items')",
      "SELECT session_id,workspace_id,agent,",
      "json_extract(value_json,'$.body.path') AS path,",
      "json_extract(value_json,'$.observedAt') AS observed_at",
      "FROM latest WHERE n=1 AND deleted=0",
      "AND json_extract(value_json,'$.body.kind')='diff' LIMIT 5001;"
    ].join(" ");
    const rows = await this.reader(this.database, sql);
    if (!Array.isArray(rows)) throw new Error("Worktree chat file history is unavailable.");
    if (rows.length > 5e3) throw new Error("Worktree chat file history exceeds its safe metadata limit.");
    const files = /* @__PURE__ */ new Map();
    for (const value of rows) {
      const r = object3(value);
      if (!r || typeof r.workspace_id !== "string" || !owners.includes(r.workspace_id) || typeof r.session_id !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(r.session_id) || typeof r.path !== "string" || r.path.length > 2048 || r.path.includes("\0")) continue;
      if (!path10.isAbsolute(r.path) || !within(w.root, r.path)) continue;
      const file = path10.resolve(r.path), event = { agent: typeof r.agent === "string" ? r.agent : "agent", workspaceId: w.id, tool: "native-file-change", conversationId: r.session_id, orcaTabId: "structured-agent-session-" + r.session_id };
      files.set(file, { file, event });
    }
    return [...files.values()];
  }
};

// src/worker/chat-asset-discovery.ts
import path11 from "node:path";
import { readdir as readdir2 } from "node:fs/promises";
async function collectChatAssets(source, settings, stopped, ingest) {
  let entries = 0;
  async function visit(folder, depth) {
    if (stopped() || depth > 12) return;
    for (const entry of await readdir2(folder, { withFileTypes: true })) {
      if (stopped()) return;
      if (++entries > 1e4) throw new Error("Chat asset discovery reached its 10,000-entry limit.");
      const file = path11.join(folder, entry.name), relative = path11.relative(source.root, file);
      if (entry.isSymbolicLink() || excluded(relative, settings.excludedFolders) || relative.split(path11.sep).some((p) => ["video-tools", "site-packages", "imageio_ffmpeg"].includes(p))) continue;
      if (entry.isDirectory()) await visit(file, depth + 1);
      else if (entry.isFile() && supported(file, settings.extensions)) await ingest(file);
    }
  }
  try {
    await visit(source.root, 0);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

// src/worker/index.ts
var shutdown;
var message = (e) => e instanceof Error ? e.message : String(e);
var invalid2 = (text) => Object.assign(new Error(text), { code: "invalid_params" });
function settingsInput(input) {
  if (!input || typeof input !== "object") throw invalid2("Invalid discovery settings");
  const v = input;
  if (v.includeUnavailable !== void 0 && typeof v.includeUnavailable !== "boolean") throw invalid2("Include unavailable files must be enabled or disabled");
  if (!Array.isArray(v.includedFolders) || !Array.isArray(v.excludedFolders) || !Array.isArray(v.extensions) || typeof v.includeIgnored !== "boolean" || !Number.isFinite(v.maxSizeMB) || v.maxSizeMB < 1 || v.maxSizeMB > 64) throw invalid2("Use a file-size limit from 1 to 64 MB");
  for (const f of [...v.includedFolders, ...v.excludedFolders]) if (typeof f !== "string" || f.length > 500 || path12.isAbsolute(f) || f.split(/[\/\\]/).includes("..")) throw invalid2("Folders must be relative paths inside the worktree");
  if (v.includedFolders.length > 32 || v.excludedFolders.length > 64 || !v.extensions.length || v.extensions.some((e) => !EXTENSIONS.includes(e))) throw invalid2("Choose supported asset extensions");
  return { includedFolders: v.includedFolders.filter(Boolean), excludedFolders: v.excludedFolders.filter(Boolean), extensions: [...new Set(v.extensions)], maxSizeMB: v.maxSizeMB, includeIgnored: v.includeIgnored, includeUnavailable: v.includeUnavailable ?? false };
}
async function activate(orca, options) {
  let stopped = false, workspaces = [], active = null, settings = { ...DEFAULT_SETTINGS };
  let refreshTask;
  const subscriptions = [], terminals = /* @__PURE__ */ new Map(), aliases = /* @__PURE__ */ new Map(), warnings = /* @__PURE__ */ new Set();
  const report = (e) => {
    const s = message(e);
    if (warnings.has(s)) return;
    warnings.add(s);
    while (warnings.size > 8) warnings.delete(warnings.values().next().value);
    orca.log("Assets Library: " + s);
  };
  let postTimer;
  const changed = () => {
    if (stopped || postTimer) return;
    postTimer = setTimeout(() => {
      postTimer = void 0;
      if (!stopped) orca.panels.post("library.changed", { revision: index.revision });
    }, 120);
  };
  const persistence = new Persistence(orca.storage, report), thumbs = new ThumbnailService(orca.storage), index = new AssetIndex(persistence, thumbs, changed), observer = new AgentObserver();
  const editorCopies = new EditorCopies(orca.storage);
  let chain = Promise.resolve();
  const queue = (task) => {
    const next = chain.then(task);
    chain = next.then(() => {
    }, report);
    return next;
  };
  let loadedContext = "", reconcileController;
  const reconciliations = /* @__PURE__ */ new Set();
  const nativeWorkspaces = options?.nativeWorkspaces ?? new NativeWorkspaceAdapter();
  const generatedHistory = options?.generatedHistory === false ? void 0 : options?.generatedHistory ?? new NativeWorktreeAdapter();
  let historyRunning = false, historyWorkspace = "";
  const chatSources = /* @__PURE__ */ new Map();
  function sourceFor(a) {
    const owner = a.sourceRoot ? chatSources.get(a.sourceRoot) : void 0;
    return owner?.worktreeId === a.worktreeId && owner.source.conversationId === a.conversationId && within(owner.source.root, a.originalPath ?? a.absolutePath) ? owner.source : void 0;
  }
  let collectionProgress = { status: "idle", found: 0, scanned: 0, skipped: 0 };
  function collectWorktreeHistory() {
    const w = active;
    if (!generatedHistory || !w?.root || historyRunning || stopped) return;
    historyRunning = true;
    const current = { status: "running", found: 0, scanned: 0, skipped: 0 };
    if (historyWorkspace !== w.id + ":" + w.root) {
      historyWorkspace = w.id + ":" + w.root;
      collectionProgress = current;
      changed();
    }
    const task = (async () => {
      const stoppedHere = () => stopped || active?.id !== w.id;
      const ingest = async (file, event, source) => {
        current.scanned++;
        if (stoppedHere()) return;
        const root = source?.root ?? w.root;
        if (!supported(file, settings.extensions) || excluded(path12.relative(root, file), settings.excludedFolders)) return;
        try {
          const canonical = await safePath(root, file), s = await stat5(canonical), known = index.records.get(index.id(w, canonical));
          if (known?.originalPath === canonical) {
            try {
              const copy = await safePath(w.root, known.absolutePath), cs = await stat5(copy);
              if (known.status === "missing" || known.updatedAt !== cs.mtimeMs || known.sizeBytes !== cs.size) await queue(() => index.ingest(w, copy, known.origin, settings.maxSizeMB * 1024 * 1024));
              return;
            } catch {
            }
          }
          if (known?.absolutePath === canonical && known.worktreeId === w.id && known.projectId === w.libraryProjectId && known.status !== "missing" && known.updatedAt === s.mtimeMs && known.sizeBytes === s.size) return;
          await queue(async () => {
            if (!stoppedHere()) {
              await index.ingest(w, canonical, source ? "chat-output" : "confirmed-agent", settings.maxSizeMB * 1024 * 1024, event, source);
              current.found++;
            }
          });
        } catch (e) {
          if (e.code === "EACCES") report("Could not read asset " + path12.basename(file) + ": " + message(e));
        }
      };
      try {
        const sources = await generatedHistory.sources(w, nativeWorkspaces.aliases);
        if (stoppedHere()) return;
        for (const [root, owner] of chatSources) if (owner.worktreeId === w.id) chatSources.delete(root);
        for (const source of sources) chatSources.set(source.root, { worktreeId: w.id, source });
        for (const source of sources) {
          await collectChatAssets(source, settings, stoppedHere, (file) => ingest(file, void 0, source));
          for (const a of index.records.values()) if (a.worktreeId === w.id && a.sourceRoot === source.root) {
            try {
              await stat5(await safePath(a.originalPath ? w.root : source.root, a.absolutePath));
            } catch {
              index.missing(a.id);
            }
          }
        }
      } catch (e) {
        for (const [root, owner] of chatSources) if (owner.worktreeId === w.id) chatSources.delete(root);
        report("Chat output discovery unavailable: " + message(e));
      }
      for (const candidate of await generatedHistory.assets(w, nativeWorkspaces.aliases)) {
        if (stoppedHere()) return;
        await ingest(candidate.file, candidate.event);
      }
    })().then(() => {
      current.status = "complete";
    }, (e) => {
      current.status = "failed";
      current.message = message(e);
      report("Worktree chat file history unavailable: " + message(e));
    }).finally(() => {
      historyRunning = false;
      if (collectionProgress === current) changed();
    });
    reconciliations.add(task);
    void task.finally(() => reconciliations.delete(task));
  }
  let nativePanes = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  function schedule(w, file, origin, event) {
    const root = w.root;
    if (stopped || !root || !supported(file, settings.extensions) || excluded(path12.relative(root, file), settings.excludedFolders)) return;
    const k = w.id + ":" + file, prev = pending.get(k);
    if (prev) clearTimeout(prev.timer);
    const candidate = { w, file, origin: prev?.origin === "confirmed-agent" ? prev.origin : origin, event: event ?? prev?.event, timer: setTimeout(() => {
      pending.delete(k);
      void queue(async () => {
        if (stopped) return;
        await index.ingest(w, file, candidate.origin, settings.maxSizeMB * 1024 * 1024, candidate.event);
      }).catch((e) => {
        if (candidate.origin === "confirmed-agent") report(e);
      });
    }, 550) };
    if (pending.size >= 2048 && !prev) {
      report("Too many pending filesystem changes; reopen the worktree or refresh generated assets after writes settle.");
      clearTimeout(candidate.timer);
      return;
    }
    pending.set(k, candidate);
  }
  const watcher = new FileWatcher((w, file, removed) => {
    const known = index.records.get(index.id(w, file));
    if (known && path12.resolve(file) !== known.absolutePath) return;
    if (removed) {
      if (known) index.missing(known.id);
      return;
    }
    if (known && isGeneratedAsset(known)) schedule(w, file, known.origin);
  }, report, () => settings.excludedFolders);
  async function refreshNativeWorkspaces() {
    if (stopped) return;
    const previousAppearance = JSON.stringify(workspaces.map((w) => w.projectAppearance));
    try {
      const warning = await nativeWorkspaces.sync(workspaces);
      if (warning) report(warning);
    } catch (e) {
      report("Native workspace inventory unavailable: " + message(e));
    }
    if (previousAppearance !== JSON.stringify(workspaces.map((w) => w.projectAppearance))) changed();
    for (const [alias, id] of nativeWorkspaces.aliases) aliases.set(alias, id);
    const currentPanes = new Map(nativeWorkspaces.activities.map((a) => [a.paneKey, a.workspaceId]));
    for (const [pane, workspaceId] of nativePanes) if (!currentPanes.has(pane)) observer.set(workspaceId, pane, "done", Date.now());
    for (const a of nativeWorkspaces.activities) observer.set(a.workspaceId, a.paneKey, a.state, a.startedAt);
    nativePanes = currentPanes;
    if (!active && nativeWorkspaces.activeWorkspaceId) active = workspaces.find((w) => w.id === nativeWorkspaces.activeWorkspaceId) ?? null;
    collectWorktreeHistory();
  }
  const initialized = (async () => {
    await thumbs.init();
    for (const a of await persistence.load()) {
      if (isGeneratedAsset(a)) index.restore(a);
      else persistence.remove(a.id);
    }
    const v = await orca.storage.get("discovery.settings.v1");
    if (v) try {
      settings = settingsInput(v);
    } catch {
      report("Saved settings were invalid; using defaults.");
    }
    if (await orca.storage.get("discovery.formats.v2") !== true) {
      const previousDefaults = ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"];
      if (settings.extensions.length === previousDefaults.length && previousDefaults.every((e) => settings.extensions.includes(e))) {
        settings = { ...settings, extensions: [...settings.extensions, "md", "markdown"] };
        await orca.storage.set("discovery.settings.v1", settings);
      }
      await orca.storage.set("discovery.formats.v2", true);
    }
    if (await orca.storage.get("discovery.formats.v3") !== true) {
      const previousDefaults = EXTENSIONS.filter((e) => !["mp4", "webm", "html", "htm"].includes(e));
      if (settings.extensions.length === previousDefaults.length && previousDefaults.every((e) => settings.extensions.includes(e))) {
        settings = { ...settings, extensions: [...settings.extensions, "mp4", "webm"] };
        await orca.storage.set("discovery.settings.v1", settings);
      }
      await orca.storage.set("discovery.formats.v3", true);
    }
    if (await orca.storage.get("discovery.formats.v4") !== true) {
      const previousDefaults = EXTENSIONS.filter((e) => !["html", "htm"].includes(e));
      if (settings.extensions.length === previousDefaults.length && previousDefaults.every((e) => settings.extensions.includes(e))) {
        settings = { ...settings, extensions: [...settings.extensions, "html", "htm"] };
        await orca.storage.set("discovery.settings.v1", settings);
      }
      await orca.storage.set("discovery.formats.v4", true);
    }
  })();
  function context() {
    return { active, workspaces, reason: active?.reason ?? (!active ? "Orca could not identify the active worktree unambiguously. Open a local workspace with a unique name." : void 0), warnings: [...warnings], refreshing: !!refreshTask, collectionProgress, settings, canOpen: orca.host.has("editor.open"), watching: watcher.watchers.size };
  }
  async function refreshContext() {
    await initialized;
    if (stopped) return;
    if (!orca.host.has("workspace.list")) throw new Error("This Orca does not expose workspace.list.");
    const listed = await orca.host.call("workspace.list");
    const next = [];
    for (const w of listed.workspaces) next.push(await resolveWorkspace(w));
    if (!listed.truncated) {
      for (const w of workspaces) if (!next.some((n) => n.id === w.id)) {
        observer.remove(w.id);
        for (const a of index.records.values()) if (a.worktreeId === w.id) index.missing(a.id);
      }
    } else warnings.add("Orca truncated its workspace list; project coverage may be incomplete.");
    workspaces = next;
    await repairRenamedPluginPaths(workspaces, index, settings.maxSizeMB * 1024 * 1024);
    active = chooseActive(await orca.host.call("workspace.readContext"), workspaces, terminals);
    await refreshNativeWorkspaces();
    const priority = (w) => w.id === active?.id ? 2 : w.libraryProjectId === active?.libraryProjectId ? 1 : 0;
    const prioritized = [...workspaces].sort((a, b) => priority(b) - priority(a));
    await watcher.sync(prioritized);
    if (prioritized.filter((w) => w.root).length > 24) warnings.add("Watching 24 local workspaces; explicit tool evidence still indexes other listed worktrees.");
    if (active) {
      const agents = await orca.host.call("agents.list");
      for (const a of agents.agents) if (a.terminalId) {
        terminals.set(a.terminalId, active.id);
        observer.set(active.id, a.terminalId, a.state, a.stateStartedAt);
      }
    }
    const targets = workspaces.filter((w) => w.root && !w.reason && w.id === active?.id);
    const loadKey = active?.root ? active.id + ":" + active.libraryProjectId + ":" + targets.map((w) => w.id + ":" + w.root).sort().join("|") : "";
    if (loadKey !== loadedContext) {
      loadedContext = loadKey;
      reconcileController?.abort();
      reconcileController = void 0;
      if (loadKey) {
        const controller = new AbortController();
        reconcileController = controller;
        const task = reconcileWorkspace(targets, [...index.records.values()], { ...settings }, controller.signal, async (w, file, origin) => {
          await queue(async () => {
            if (stopped || controller.signal.aborted || !workspaces.some((current) => current.id === w.id && current.root === w.root)) return;
            await index.ingest(w, file, origin, settings.maxSizeMB * 1024 * 1024);
          });
        }, (id) => {
          if (!stopped && !controller.signal.aborted) index.missing(id);
        }, report).catch((e) => {
          if (!controller.signal.aborted) report(e);
        });
        reconciliations.add(task);
        void task.finally(() => reconciliations.delete(task));
      }
    }
    orca.panels.post("library.contextChanged", { revision: index.revision });
  }
  function workspaceFor(e) {
    const id = e.workspaceListId ?? (e.workspaceId ? aliases.get(e.workspaceId) ?? e.workspaceId : void 0);
    let w = workspaces.find((w2) => w2.id === id);
    if (!w && e.terminalId) {
      const mapped = terminals.get(e.terminalId);
      w = workspaces.find((w2) => w2.id === mapped);
      if (w && e.workspaceId) aliases.set(e.workspaceId, w.id);
    }
    return w;
  }
  const before = /* @__PURE__ */ new Map();
  const key = (e) => [e.agent, e.workspaceId, e.terminalId, e.callId ?? e.tool].join(":");
  async function fingerprint(w, file) {
    try {
      const { bytes } = await readAsset(w.root, file, settings.maxSizeMB * 1024 * 1024);
      return createHash6("sha256").update(bytes).digest("hex");
    } catch {
      return null;
    }
  }
  subscriptions.push(orca.hooks.on("agent.tool.before", (event, next) => {
    const e = event, w = workspaceFor(e), ev = evidence(e);
    if (w?.root && ev) {
      const at = Date.now();
      before.set(key(e), { at, fingerprints: Promise.all(ev.paths.slice(0, 128).map(async (p) => [p, await fingerprint(w, p)])).then((pairs) => new Map(pairs)) });
      if (before.size > 512) before.delete(before.keys().next().value);
    }
    return next(event);
  }));
  subscriptions.push(orca.hooks.on("agent.tool.after", (event) => {
    const e = event, snapshot = before.get(key(e));
    before.delete(key(e));
    void queue(async () => {
      await initialized;
      const w = workspaceFor(e), ev = evidence(e);
      if (!w?.root || !ev) return;
      if (e.terminalId) terminals.set(e.terminalId, w.id);
      const fingerprints = await snapshot?.fingerprints;
      for (const file of ev.paths.slice(0, 128)) {
        if (!supported(file)) continue;
        const current = await fingerprint(w, file);
        if (!current) continue;
        const hasBefore = fingerprints?.has(file), old = fingerprints?.get(file);
        if (ev.kind === "output" || hasBefore && current !== old) schedule(w, file, "confirmed-agent", e);
      }
    }).catch(report);
  }));
  subscriptions.push(orca.hooks.on("agent.launch.before", (e, next) => {
    const w = workspaceFor(e);
    if (w && e.terminalId) terminals.set(e.terminalId, w.id);
    return next(e);
  }));
  subscriptions.push(orca.events.on("agent.status.changed", (e) => {
    const w = workspaceFor(e);
    if (w) {
      if (e.terminalId) terminals.set(e.terminalId, w.id);
      observer.set(w.id, e.terminalId ?? e.paneKey, e.state, e.receivedAt);
    }
    changed();
  }));
  for (const event of ["workspace.created", "workspace.removed"]) subscriptions.push(orca.events.on(event, (e) => {
    const match = workspaces.find((w) => w.path === e.path);
    if (match) aliases.set(e.workspaceId, match.id);
    void queue(async () => {
      await refreshContext();
      const listed = workspaces.find((w) => w.path === e.path);
      if (listed) aliases.set(e.workspaceId, listed.id);
    }).catch(report);
  }));
  subscriptions.push(orca.events.on("workspace.changed", () => {
    void queue(refreshContext).catch(report);
  }));
  async function record(id) {
    await initialized;
    const a = index.records.get(id);
    if (!a) throw invalid2("Unknown asset");
    const w = workspaces.find((w2) => w2.id === a.worktreeId);
    if (!w?.root || w.reason) throw new Error("Asset worktree is unavailable");
    const source = a.location === "chat" && !a.originalPath ? sourceFor(a) : void 0, root = a.location === "chat" && !a.originalPath ? source?.root : w.root;
    if (!isGeneratedAsset(a) || !root || !within(root, a.absolutePath)) throw invalid2("Asset is not owned by this worktree or its chats");
    await safePath(root, a.absolutePath);
    return { a, w, root, source };
  }
  function handle(name, handler) {
    subscriptions.push(orca.panels.handle(name, async (input) => JSON.parse(JSON.stringify(await handler(input)))));
  }
  handle("library.context", async () => {
    await initialized;
    if (!workspaces.length) await queue(refreshContext);
    return context();
  });
  handle("library.list", async (q) => {
    await initialized;
    if (!q || !["project", "worktree"].includes(q.scope) || !["generated", "discovered"].includes(q.mode)) throw invalid2("Invalid gallery query");
    const assets = selectAssets([...index.records.values()].filter((a) => a.location !== "chat" || a.originalPath || sourceFor(a)), active, { ...q, scope: "worktree", mode: "generated", includeUnavailable: settings.includeUnavailable }), offset = Math.max(0, Math.floor(q.offset ?? 0)), limit = Math.min(100, Math.max(1, Math.floor(q.limit ?? 80)));
    return { assets: assets.slice(offset, offset + limit), total: assets.length, revision: index.revision };
  });
  handle("library.detail", async ({ id }) => {
    await initialized;
    const a = index.records.get(id);
    if (!a) throw invalid2("Unknown asset");
    return a;
  });
  handle("library.thumbnail", async ({ id }) => {
    try {
      const { a, root } = await record(id);
      const cached = await thumbs.get(a.contentHash);
      if (cached) return { mimeType: cached.slice(5, cached.indexOf(";")), data: cached };
      if (a.mimeType === "text/markdown") {
        const { bytes } = await readAsset(root, a.absolutePath, Math.min(2, settings.maxSizeMB) * 1024 * 1024), data = markdownThumbnail(validateMarkdown(bytes));
        return { mimeType: "image/svg+xml", data: "data:image/svg+xml;base64," + data.toString("base64") };
      }
      if (a.mimeType === "text/html") {
        const { bytes } = await readAsset(root, a.absolutePath, Math.min(2, settings.maxSizeMB) * 1024 * 1024), data = htmlThumbnail(validateHtml(bytes));
        return { mimeType: "image/svg+xml", data: "data:image/svg+xml;base64," + data.toString("base64") };
      }
      return { mimeType: a.mimeType, needsOriginal: true };
    } catch (e) {
      return { mimeType: "image/webp", error: message(e) };
    }
  });
  handle("library.cacheThumbnail", async ({ id, contentHash, data }) => {
    const { a } = await record(id);
    if (a.contentHash !== contentHash) return { stored: false };
    if (typeof data !== "string" || data.length > 2e5 || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) throw invalid2("Invalid thumbnail");
    const bytes = Buffer.from(data.slice(data.indexOf(",") + 1), "base64"), metadata = imageMetadata(validatedInput(bytes));
    if (metadata.mimeType !== "image/webp" || metadata.width > 480 || metadata.height > 480 || bytes.length > 144 * 1024) throw invalid2("Thumbnail exceeds bounds");
    await thumbs.put(contentHash, bytes);
    return { stored: true };
  });
  const originals = /* @__PURE__ */ new Map();
  handle("library.documentPreview", async ({ id }) => {
    const { a, root } = await record(id);
    if (!["text/markdown", "text/html"].includes(a.mimeType)) throw invalid2("Not a supported text document");
    const data = await readAsset(root, a.absolutePath, Math.min(2, settings.maxSizeMB) * 1024 * 1024);
    return { text: (a.mimeType === "text/html" ? validateHtml(data.bytes) : validateMarkdown(data.bytes)).slice(0, 3e3).split(/\r?\n/).slice(0, 64).join("\n") };
  });
  handle("library.preview", async ({ id, offset, contentHash }) => {
    if (!Number.isInteger(offset) || offset < 0 || offset % CHUNK_SIZE !== 0) throw invalid2("Invalid preview offset");
    try {
      const { a, root, w, source } = await record(id);
      if (contentHash && contentHash !== a.contentHash) throw new Error("Asset changed while loading. Retry the preview.");
      let original = originals.get(id);
      if (!original || original.hash !== a.contentHash || Date.now() - original.at > 3e4) {
        const data = await readAsset(root, a.absolutePath, Math.min(16, settings.maxSizeMB) * 1024 * 1024);
        if (createHash6("sha256").update(data.bytes).digest("hex") !== a.contentHash) {
          await queue(() => index.ingest(w, a.absolutePath, a.origin, settings.maxSizeMB * 1024 * 1024, void 0, source));
          throw new Error("Asset changed while loading. Retry the preview.");
        }
        const isDocument = ["text/markdown", "text/html"].includes(a.mimeType), isVideo = a.mimeType.startsWith("video/"), bytes = isDocument ? Buffer.from(a.mimeType === "text/html" ? validateHtml(data.bytes) : validateMarkdown(data.bytes)) : isVideo ? data.bytes : validatedInput(data.bytes);
        if (isVideo) videoMetadata(bytes, "." + a.extension);
        else if (!isDocument) imageMetadata(bytes);
        original = { bytes, hash: a.contentHash, at: Date.now() };
        originals.delete(id);
        originals.set(id, original);
        while (originals.size > 4 || [...originals.values()].reduce((n, v) => n + v.bytes.length, 0) > 32 * 1024 * 1024) originals.delete(originals.keys().next().value);
      }
      return { mimeType: a.mimeType, contentHash: original.hash, totalBytes: original.bytes.length, data: original.bytes.subarray(offset, offset + CHUNK_SIZE).toString("base64") };
    } catch (e) {
      return { mimeType: "image/webp", error: message(e) };
    }
  });
  handle("library.settings", async (input) => {
    settings = settingsInput(input);
    await orca.storage.set("discovery.settings.v1", settings);
    await watcher.close();
    await watcher.sync(workspaces);
    loadedContext = "";
    historyWorkspace = "";
    await queue(refreshContext);
    return settings;
  });
  handle("library.refresh", async () => {
    await initialized;
    if (refreshTask) return { ok: true };
    if (!active?.root) throw invalid2("Open a local worktree first");
    const workspaceId = active.id;
    const run = async () => {
      historyWorkspace = "";
      loadedContext = "";
      await queue(refreshContext);
      await Promise.all([...reconciliations]);
      for (const a of [...index.records.values()]) {
        if (stopped || active?.id !== workspaceId) return;
        if (a.worktreeId !== workspaceId || !isGeneratedAsset(a)) continue;
        try {
          const { w, root, source } = await record(a.id), s = await stat5(await safePath(root, a.absolutePath));
          if (a.status === "missing" || a.updatedAt !== s.mtimeMs || a.sizeBytes !== s.size) await queue(() => index.ingest(w, a.absolutePath, a.origin, settings.maxSizeMB * 1024 * 1024, void 0, source));
        } catch (e) {
          index.missing(a.id);
          report(e);
        }
      }
    };
    refreshTask = run().catch(report).finally(() => {
      refreshTask = void 0;
      changed();
    });
    changed();
    return { ok: true };
  });
  handle("library.action", async ({ id, action }) => {
    const { a, w } = await record(id);
    if (action === "open") {
      try {
        let preferred;
        if (a.location === "chat" && !a.originalPath) {
          for (const candidate of index.records.values()) {
            if (candidate.id === a.id || candidate.worktreeId !== w.id || candidate.projectId !== w.libraryProjectId || candidate.location === "chat" || candidate.originalPath || candidate.origin !== "confirmed-agent" || candidate.relativePath !== a.relativePath) continue;
            try {
              const current = await extract(w.root, candidate.absolutePath, settings.maxSizeMB * 1024 * 1024);
              const source = await extract(a.sourceRoot, a.absolutePath, settings.maxSizeMB * 1024 * 1024);
              if (current.contentHash === source.contentHash || candidate.conversationId === a.conversationId) {
                preferred = candidate;
                break;
              }
            } catch {
            }
          }
        }
        const result = await openOriginal(a, w, (input) => orca.host.call("editor.open", input), options?.openBrowser, async (asset, workspace) => {
          const root = asset.location === "chat" ? asset.sourceRoot : workspace.root, source = asset.location === "chat" ? sourceFor(asset) : void 0;
          if (asset.location === "chat" && !source) throw invalid2("Chat source ownership is unavailable");
          const metadata = await extract(root, asset.absolutePath, settings.maxSizeMB * 1024 * 1024);
          const file = await editorCopies.materialize(workspace, { ...asset, contentHash: metadata.contentHash }, settings.maxSizeMB * 1024 * 1024);
          await queue(() => index.ingest(workspace, file, asset.origin, settings.maxSizeMB * 1024 * 1024, void 0, source, { path: asset.absolutePath, contentHash: metadata.contentHash, updatedAt: metadata.mtime, sizeBytes: metadata.size }));
          originals.delete(asset.id);
          return file;
        }, preferred);
        return { ok: true, ...result?.workingCopy ? { message: "Opened a working copy. Edits affect the copy; its original stays unchanged." } : {} };
      } catch (e) {
        return { ok: false, message: "Could not open " + a.filename + " in Orca: " + message(e) };
      }
    }
    if (action === "explorer") {
      if (a.location === "chat" && !a.originalPath) return { ok: false, message: "This historical file is stored with its chat. Copy its absolute path, or use Open to prepare an editor copy when needed." };
      await orca.host.call("workspace.open", { workspaceId: w.id });
      await orca.host.call("commands.run", { action: "sidebar.explorer.toggle" });
      return { ok: true, message: "Opened native Explorer. Locate " + a.relativePath + "." };
    }
    throw invalid2("Unknown file action");
  });
  await initialized;
  await queue(refreshContext).catch(report);
  const timer = setInterval(() => {
    void queue(refreshContext).catch(report);
  }, 3e4);
  timer.unref();
  const inventoryTimer = setInterval(() => {
    void queue(refreshNativeWorkspaces).catch(report);
  }, 5e3);
  inventoryTimer.unref();
  shutdown = async () => {
    stopped = true;
    clearInterval(timer);
    clearInterval(inventoryTimer);
    clearTimeout(postTimer);
    reconcileController?.abort();
    for (const c of pending.values()) clearTimeout(c.timer);
    pending.clear();
    for (const s of subscriptions) s.dispose();
    await watcher.close();
    await refreshTask;
    await Promise.all([...reconciliations]);
    await chain;
    await persistence.close();
    originals.clear();
  };
}
async function deactivate() {
  await shutdown?.();
  shutdown = void 0;
}
export {
  deactivate,
  activate as default,
  settingsInput
};
