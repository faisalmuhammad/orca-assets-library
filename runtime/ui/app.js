// src/panel/components/dom.ts
var typeLabels = { "image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WebP", "image/svg+xml": "SVG", "image/gif": "GIF", "image/avif": "AVIF", "text/markdown": "Markdown", "text/html": "HTML", "video/mp4": "MP4", "video/webm": "WebM" };
function assetTypeLabel(a) {
  return typeLabels[a.mimeType] ?? (a.extension.toUpperCase() || "Unknown type");
}
function el(tag2, text = "", className = "") {
  const e = document.createElement(tag2);
  e.textContent = text;
  e.className = className;
  return e;
}
var paths = { loader: "M12 3a9 9 0 1 1-9 9", video: "M3 5h18v14H3V5 M10 9l5 3-5 3V9", blocks: "M15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M4 7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z M10 14h10a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H10", book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z", layers: "m12 3 9 5-9 5-9-5 9-5 M3 12l9 5 9-5 M3 16l9 5 9-5", refresh: "M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 2 M4 17l2 2a7 7 0 0 0 12-2", search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0", settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2", more: "M5 12h.01 M12 12h.01 M19 12h.01", arrow: "M5 12h14 M13 6l6 6-6 6", back: "M19 12H5 M11 6l-6 6 6 6", image: "M3 3h18v18H3V3 M3 16l5-5 4 4 3-3 6 6 M16 7h.01", open: "M14 3h7v7 M21 3l-9 9 M10 3H3v18h18v-7", copy: "M8 8h13v13H8V8 M16 8V3H3v13h5", folder: "M3 6h7l2 3h9v12H3V6", close: "m6 6 12 12 M6 18 18 6", check: "m5 12 4 4 10-10", zoom: "M12 7v10 M7 12h10", minus: "M7 12h10", fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5", info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01", list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01", grid: "M3 3h7v7H3V3 M14 3h7v7h-7V3 M3 14h7v7H3v-7 M14 14h7v7h-7v-7", spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3" };
paths["project-box"] = "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8 M3.3 7 12 12l8.7-5 M12 22V12";
paths["project-sparkles"] = "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3 M5 3v4 M3 5h4 M19 17v4 M17 19h4";
paths["project-code"] = "m18 16 4-4-4-4 M6 8l-4 4 4 4 M14.5 4l-5 16";
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  if (name === "more") {
    for (const x of [5, 12, 19]) {
      const dot = document.createElementNS(svg.namespaceURI, "circle");
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", "12");
      dot.setAttribute("r", "1.6");
      dot.setAttribute("fill", "currentColor");
      dot.setAttribute("stroke", "none");
      svg.append(dot);
    }
    return svg;
  }
  const p = document.createElementNS(svg.namespaceURI, "path");
  p.setAttribute("d", paths[name] ?? paths.image);
  svg.append(p);
  return svg;
}
function button(label, action, kind = "", glyph) {
  const b = el("button", glyph ? "" : label, kind);
  b.type = "button";
  if (glyph) b.append(icon(glyph), el("span", label));
  b.onclick = () => {
    void action();
  };
  return b;
}
function iconButton(label, glyph, action) {
  const b = button(label, action, "icon-button", glyph);
  b.title = label;
  b.setAttribute("aria-label", label);
  return b;
}
function select(label, options2, value, change) {
  const s = el("select");
  s.setAttribute("aria-label", label);
  for (const [v, t] of options2) {
    const o = el("option", t);
    o.value = v;
    s.append(o);
  }
  s.value = value;
  s.onchange = () => change(s.value);
  return s;
}
var bytes = (v) => v < 1024 ? v + " B" : v < 1024 * 1024 ? (v / 1024).toFixed(0) + " KB" : (v / 1024 / 1024).toFixed(1) + " MB";
function matched(text, query2) {
  const span = el("span");
  const i = text.toLowerCase().indexOf(query2.toLowerCase());
  if (!query2 || i < 0) {
    span.textContent = text;
    return span;
  }
  span.append(document.createTextNode(text.slice(0, i)), el("mark", text.slice(i, i + query2.length)), document.createTextNode(text.slice(i + query2.length)));
  return span;
}

// src/panel/components/AssetCard.ts
function assetCard(a, query2, project, actions) {
  const card = el("article", "", "asset-card");
  card.dataset.id = a.id;
  card.setAttribute("role", "gridcell");
  const visual = el("div", "", "asset-visual"), isVideo = a.mimeType.startsWith("video/");
  const face = el("button", "", isVideo ? "asset-face" : "asset-face checker");
  face.type = "button";
  face.setAttribute("aria-label", "Open " + a.filename + " in editor");
  face.title = a.relativePath;
  face.onclick = actions.open;
  card.onclick = (e) => {
    if (!card.closest(".asset-list") || e.target.closest("button")) return;
    face.focus({ preventScroll: true });
    actions.open();
  };
  const img = el("img");
  img.alt = a.filename;
  img.draggable = false;
  img.decoding = "async";
  img.hidden = true;
  const placeholder = el("div", "", "placeholder");
  placeholder.append(icon(isVideo ? "video" : "image"), el("span", a.status === "missing" ? "File unavailable" : isVideo ? assetTypeLabel(a) : "", "placeholder-label"));
  face.append(placeholder, img);
  if (a.status === "missing") card.classList.add("missing");
  else if (Date.now() - a.updatedAt < 6e4 && a.origin === "confirmed-agent") {
    const badge = el("span", a.status === "modified" ? "Changed" : "New", "new-indicator");
    face.append(badge);
  }
  const actionsRow = el("div", "", "card-actions");
  const open2 = button("Open", actions.open, "card-action"), info = button("Info", actions.info, "card-action");
  open2.setAttribute("aria-label", "Open " + a.filename);
  info.setAttribute("aria-label", "Info for " + a.filename);
  actionsRow.append(open2, info);
  visual.append(face, actionsRow);
  const meta = el("div", "", "card-meta"), name = el("div", "", "filename");
  name.append(matched(a.filename, query2));
  name.title = a.filename;
  const state = a.status === "missing" ? "File unavailable" : "";
  const summary = a.mimeType.startsWith("image/") ? state || (a.width && a.height ? a.width + " \xD7 " + a.height : assetTypeLabel(a)) : assetTypeLabel(a) + (state ? " \xB7 " + state : "");
  const detail2 = el("span", (project ? a.worktreeName + " \xB7 " : "") + summary, "micro muted");
  const path = el("div", "", "asset-path micro");
  path.append(matched(a.relativePath, query2));
  path.title = a.relativePath;
  const size = el("span", " \xB7 " + bytes(a.sizeBytes), "list-size");
  detail2.append(size);
  meta.append(name, path, detail2);
  card.append(visual, meta);
  return { card, img, placeholder, face };
}

// src/panel/components/AssetGrid.ts
var AssetGrid = class {
  constructor(scroller2, query2, fetch, info, open2, thumbnail2, count2, error) {
    this.scroller = scroller2;
    this.query = query2;
    this.fetch = fetch;
    this.info = info;
    this.open = open2;
    this.thumbnail = thumbnail2;
    this.count = count2;
    this.error = error;
    this.element.setAttribute("role", "grid");
    this.element.setAttribute("aria-label", "Visual assets");
    this.element.append(this.rows);
    scroller2.addEventListener("scroll", () => this.draw(), { passive: true });
    new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.measure();
        this.draw();
      });
    }).observe(scroller2);
    this.element.onkeydown = (e) => {
      const current = e.target.closest("[data-id]");
      if (!current) return;
      const found = [...this.cache].find(([, a2]) => a2.id === current.dataset.id);
      if (!found) return;
      let i = found[0];
      switch (e.key) {
        case "ArrowRight":
          i++;
          break;
        case "ArrowLeft":
          i--;
          break;
        case "ArrowDown":
          i += this.columns;
          break;
        case "ArrowUp":
          i -= this.columns;
          break;
        case "Home":
          i = 0;
          break;
        case "End":
          i = this.total - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      this.keyboardFocusPending = true;
      this.focusIndex = Math.max(0, Math.min(this.total - 1, i));
      const a = this.cache.get(this.focusIndex);
      if (a) this.selected = a.id;
      this.scroller.scrollTop = Math.floor(this.focusIndex / this.columns) * this.rowHeight;
      this.draw();
    };
  }
  element = el("div", "", "asset-grid");
  rows = el("div", "", "grid-rows");
  cache = /* @__PURE__ */ new Map();
  pages = /* @__PURE__ */ new Set();
  pending = /* @__PURE__ */ new Set();
  cards = /* @__PURE__ */ new Map();
  generation = 0;
  total = 0;
  columns = 2;
  rowHeight = 210;
  selected = "";
  focusIndex = 0;
  restoreFocusId;
  restoreFocusLabel;
  keyboardFocusPending = false;
  seen = /* @__PURE__ */ new Set();
  resizeFrame = 0;
  layout = "cards";
  focus() {
    const a = this.cache.get(this.focusIndex), card = a && this.cards.get(a.id);
    if (card) {
      card.face.focus({ preventScroll: true });
      this.keyboardFocusPending = false;
    }
  }
  setLayout(layout) {
    if (this.layout === layout) return;
    const anchor = Math.floor(this.scroller.scrollTop / this.rowHeight) * this.columns;
    this.layout = layout;
    this.element.classList.toggle("asset-list", layout === "list");
    this.measure();
    this.scroller.scrollTop = Math.floor(anchor / this.columns) * this.rowHeight;
    this.draw();
  }
  measure() {
    const width = this.scroller.clientWidth;
    this.columns = this.layout === "list" ? 1 : width < 280 ? 1 : width > 480 ? 3 : 2;
    this.rowHeight = this.layout === "list" ? 96 : Math.max(160, (width - 32 - (this.columns - 1) * 12) / this.columns * 0.84 + 64);
    this.element.style.height = Math.ceil(this.total / this.columns) * this.rowHeight + "px";
    this.element.setAttribute("aria-rowcount", String(Math.ceil(this.total / this.columns)));
    this.element.setAttribute("aria-colcount", String(this.columns));
  }
  async reload(preserve = false) {
    if (preserve) {
      this.restoreFocusId = document.activeElement?.closest("[data-id]")?.dataset.id;
      this.restoreFocusLabel = this.restoreFocusId ? document.activeElement?.getAttribute("aria-label") ?? void 0 : void 0;
    } else {
      this.focusIndex = 0;
      this.selected = "";
      this.restoreFocusId = void 0;
      this.restoreFocusLabel = void 0;
    }
    const ticket = ++this.generation, previous = this.total, scroll = this.scroller.scrollTop;
    this.cache.clear();
    this.pages.clear();
    this.pending.clear();
    this.cards.clear();
    const page = await this.fetch({ ...this.query(), offset: 0, limit: 100 });
    if (ticket !== this.generation) return;
    this.total = page.total;
    this.pages.add(0);
    page.assets.forEach((a, i) => this.cache.set(i, a));
    this.count(this.total);
    this.measure();
    if (!preserve) this.scroller.scrollTop = 0;
    else if (scroll > 0) this.scroller.scrollTop = scroll + ((this.query().sort ?? "newest") === "newest" ? Math.floor(Math.max(0, this.total - previous) / this.columns) * this.rowHeight : 0);
    this.draw();
  }
  async load(page) {
    if (this.pages.has(page) || this.pending.has(page)) return;
    const ticket = this.generation;
    this.pending.add(page);
    try {
      const result = await this.fetch({ ...this.query(), offset: page * 100, limit: 100 });
      if (ticket !== this.generation) return;
      result.assets.forEach((a, i) => this.cache.set(page * 100 + i, a));
      this.pages.add(page);
      this.draw();
      if (this.keyboardFocusPending && this.focusIndex >= page * 100 && this.focusIndex < (page + 1) * 100) this.focus();
    } catch (e) {
      this.error(e);
    } finally {
      if (ticket === this.generation) this.pending.delete(page);
    }
  }
  draw() {
    this.measure();
    const start = Math.max(0, Math.floor(this.scroller.scrollTop / this.rowHeight) - 2), end = Math.min(Math.ceil(this.total / this.columns), Math.ceil((this.scroller.scrollTop + this.scroller.clientHeight) / this.rowHeight) + 2), nodes = [];
    const focusedElement = document.activeElement, focused = focusedElement?.closest("[data-id]")?.dataset.id;
    for (let row = start; row < end; row++) {
      const line = el("div", "", "grid-row");
      line.setAttribute("role", "row");
      line.setAttribute("aria-rowindex", String(row + 1));
      line.style.transform = "translateY(" + row * this.rowHeight + "px)";
      line.style.height = this.rowHeight + "px";
      line.style.gridTemplateColumns = "repeat(" + this.columns + ", minmax(0,1fr))";
      for (let col = 0; col < this.columns; col++) {
        const i = row * this.columns + col;
        if (i >= this.total) break;
        const a = this.cache.get(i);
        if (!a) {
          void this.load(Math.floor(i / 100));
          line.append(el("div", "", "skeleton"));
          continue;
        }
        let view2 = this.cards.get(a.id);
        if (!view2) {
          view2 = assetCard(a, this.query().search ?? "", this.query().scope === "project", { info: () => {
            this.selected = a.id;
            this.focusIndex = i;
            this.info(a);
          }, open: () => this.open(a) });
          this.cards.set(a.id, view2);
          if (!this.seen.has(a.id)) {
            view2.card.classList.add("is-new");
            const created = view2.card;
            setTimeout(() => created.classList.remove("is-new"), 220);
          }
          this.seen.add(a.id);
          if (a.status !== "missing") this.thumbnail(a, view2.img, view2.placeholder);
        }
        view2.card.classList.toggle("selected", a.id === this.selected);
        view2.card.setAttribute("aria-selected", String(a.id === this.selected));
        view2.face.tabIndex = i === this.focusIndex ? 0 : -1;
        view2.face.onfocus = () => {
          this.focusIndex = i;
          this.selected = a.id;
          for (const [id, item] of this.cards) {
            item.card.classList.toggle("selected", id === a.id);
            item.card.setAttribute("aria-selected", String(id === a.id));
          }
        };
        line.append(view2.card);
      }
      nodes.push(line);
    }
    this.rows.replaceChildren(...nodes);
    const restore = focused ?? this.restoreFocusId;
    if (this.keyboardFocusPending) this.focus();
    else if (restore) {
      const target = this.cards.get(restore);
      if (target?.card.isConnected) {
        (target.card.contains(focusedElement) ? focusedElement : [...target.card.querySelectorAll("button")].find((b) => this.restoreFocusLabel && b.getAttribute("aria-label") === this.restoreFocusLabel) ?? target.face).focus({ preventScroll: true });
        this.restoreFocusId = void 0;
        this.restoreFocusLabel = void 0;
      }
    }
    if (this.cards.size > 160) {
      const visible = new Set(nodes.flatMap((n) => [...n.querySelectorAll("[data-id]")].map((c) => c.dataset.id)));
      for (const id of this.cards.keys()) if (!visible.has(id)) this.cards.delete(id);
    }
  }
  restoreSelection(id) {
    this.selected = id;
    this.draw();
    this.cards.get(id)?.face.focus({ preventScroll: true });
  }
};

// node_modules/marked/lib/marked.esm.js
function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
}
var _defaults = _getDefaults();
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}
var noopTest = { exec: () => null };
function edit(regex, opt = "") {
  let source = typeof regex === "string" ? regex : regex.source;
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(other.caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source, opt);
    }
  };
  return obj;
}
var other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceTabs: /^\t+/,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] /,
  listReplaceTask: /^\[[ xX]\] +/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,
  caret: /(^|[^\[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (bull) => new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`),
  htmlBeginRegex: (indent) => new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i")
};
var newline = /^(?:[ \t]*(?:\n|$))+/;
var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var bullet = /(?:[*+-]|\d{1,9}[.)])/;
var lheadingCore = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var lheading = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var lheadingGfm = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var blockText = /^[^\n]+/;
var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
var _tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var html = edit(
  "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))",
  "i"
).replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
var blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
};
var gfmTable = edit(
  "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
var blockGfm = {
  ...blockNormal,
  lheading: lheadingGfm,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
};
var blockPedantic = {
  ...blockNormal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
};
var escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var br = /^( {2,}|\\)\n(?!\s*$)/;
var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _punctuation = /[\p{P}\p{S}]/u;
var _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
var punctuation = edit(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, _punctuationOrSpace).getRegex();
var _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
var _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
var _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;
var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var emStrongLDelim = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuation).getRegex();
var emStrongLDelimGfm = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimAstCore = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm).replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm).replace(/punct/g, _punctuationGfmStrongEm).getRegex();
var emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
  "gu"
).replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex();
var anyPunctuation = edit(/\\(punct)/, "gu").replace(/punct/g, _punctuation).getRegex();
var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
var tag = edit(
  "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>"
).replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var link = edit(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
var nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
var reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
var inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
};
var inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
};
var inlineGfm = {
  ...inlineNormal,
  emStrongRDelimAst: emStrongRDelimAstGfm,
  emStrongLDelim: emStrongLDelimGfm,
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
var inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
var block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
};
var inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
};
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape2(html2, encode) {
  if (encode) {
    if (other.escapeTest.test(html2)) {
      return html2.replace(other.escapeReplace, getEscapeReplacement);
    }
  } else {
    if (other.escapeTestNoEncode.test(html2)) {
      return html2.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html2;
}
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return href;
}
function splitCells(tableRow, count2) {
  const row = tableRow.replace(other.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(other.splitPipe);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells.at(-1)?.trim()) {
    cells.pop();
  }
  if (count2) {
    if (cells.length > count2) {
      cells.splice(count2);
    } else {
      while (cells.length < count2) cells.push("");
    }
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(other.slashPipe, "|");
  }
  return cells;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  if (level > 0) {
    return -2;
  }
  return -1;
}
function outputLink(cap, link2, raw, lexer2, rules) {
  const href = link2.href;
  const title = link2.title || null;
  const text = cap[1].replace(rules.other.outputLinkReplace, "$1");
  lexer2.state.inLink = true;
  const token = {
    type: cap[0].charAt(0) === "!" ? "image" : "link",
    raw,
    href,
    title,
    text,
    tokens: lexer2.inlineTokens(text)
  };
  lexer2.state.inLink = false;
  return token;
}
function indentCodeCompensation(raw, text, rules) {
  const matchIndentToCode = raw.match(rules.other.indentCodeCompensation);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(rules.other.beginningSpace);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
var _Tokenizer = class {
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = cap[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text = indentCodeCompensation(raw, cap[3] || "", this.rules);
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
        text
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (this.rules.other.endingHash.test(text)) {
        const trimmed = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else if (!trimmed || this.rules.other.endingSpaceChar.test(trimmed)) {
          text = trimmed.trim();
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: rtrim(cap[0], "\n")
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let lines = rtrim(cap[0], "\n").split("\n");
      let raw = "";
      let text = "";
      const tokens = [];
      while (lines.length > 0) {
        let inBlockquote = false;
        const currentLines = [];
        let i;
        for (i = 0; i < lines.length; i++) {
          if (this.rules.other.blockquoteStart.test(lines[i])) {
            currentLines.push(lines[i]);
            inBlockquote = true;
          } else if (!inBlockquote) {
            currentLines.push(lines[i]);
          } else {
            break;
          }
        }
        lines = lines.slice(i);
        const currentRaw = currentLines.join("\n");
        const currentText = currentRaw.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
        raw = raw ? `${raw}
${currentRaw}` : currentRaw;
        text = text ? `${text}
${currentText}` : currentText;
        const top2 = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(currentText, tokens, true);
        this.lexer.state.top = top2;
        if (lines.length === 0) {
          break;
        }
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "code") {
          break;
        } else if (lastToken?.type === "blockquote") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.blockquote(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
          break;
        } else if (lastToken?.type === "list") {
          const oldToken = lastToken;
          const newText = oldToken.raw + "\n" + lines.join("\n");
          const newToken = this.list(newText);
          tokens[tokens.length - 1] = newToken;
          raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
          text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
          lines = newText.substring(tokens.at(-1).raw.length).split("\n");
          continue;
        }
      }
      return {
        type: "blockquote",
        raw,
        tokens,
        text
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list2 = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = this.rules.other.listItemRegex(bull);
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        let raw = "";
        let itemContents = "";
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        let line = cap[2].split("\n", 1)[0].replace(this.rules.other.listReplaceTabs, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split("\n", 1)[0];
        let blankLine = !line.trim();
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else if (blankLine) {
          indent = cap[1].length + 1;
        } else {
          indent = cap[2].search(this.rules.other.nonSpaceChar);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        if (blankLine && this.rules.other.blankLine.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = this.rules.other.nextBulletRegex(indent);
          const hrRegex = this.rules.other.hrRegex(indent);
          const fencesBeginRegex = this.rules.other.fencesBeginRegex(indent);
          const headingBeginRegex = this.rules.other.headingBeginRegex(indent);
          const htmlBeginRegex = this.rules.other.htmlBeginRegex(indent);
          while (src) {
            const rawLine = src.split("\n", 1)[0];
            let nextLineWithoutTabs;
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(this.rules.other.listReplaceNesting, "  ");
              nextLineWithoutTabs = nextLine;
            } else {
              nextLineWithoutTabs = nextLine.replace(this.rules.other.tabCharGlobal, "    ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (htmlBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(nextLine)) {
              break;
            }
            if (nextLineWithoutTabs.search(this.rules.other.nonSpaceChar) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLineWithoutTabs.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLineWithoutTabs.slice(indent);
          }
        }
        if (!list2.loose) {
          if (endsWithBlankLine) {
            list2.loose = true;
          } else if (this.rules.other.doubleBlankLine.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = this.rules.other.listIsTask.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(this.rules.other.listReplaceTask, "");
          }
        }
        list2.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });
        list2.raw += raw;
      }
      const lastItem = list2.items.at(-1);
      if (lastItem) {
        lastItem.raw = lastItem.raw.trimEnd();
        lastItem.text = lastItem.text.trimEnd();
      } else {
        return;
      }
      list2.raw = list2.raw.trimEnd();
      for (let i = 0; i < list2.items.length; i++) {
        this.lexer.state.top = false;
        list2.items[i].tokens = this.lexer.blockTokens(list2.items[i].text, []);
        if (!list2.loose) {
          const spacers = list2.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => this.rules.other.anyLine.test(t.raw));
          list2.loose = hasMultipleLineBreaks;
        }
      }
      if (list2.loose) {
        for (let i = 0; i < list2.items.length; i++) {
          list2.items[i].loose = true;
        }
      }
      return list2;
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        block: true,
        raw: cap[0],
        pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
        text: cap[0]
      };
      return token;
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag2 = cap[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " ");
      const href = cap[2] ? cap[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : cap[3];
      return {
        type: "def",
        tag: tag2,
        raw: cap[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (!cap) {
      return;
    }
    if (!this.rules.other.tableDelimiter.test(cap[2])) {
      return;
    }
    const headers = splitCells(cap[1]);
    const aligns = cap[2].replace(this.rules.other.tableAlignChars, "").split("|");
    const rows = cap[3]?.trim() ? cap[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [];
    const item = {
      type: "table",
      raw: cap[0],
      header: [],
      align: [],
      rows: []
    };
    if (headers.length !== aligns.length) {
      return;
    }
    for (const align of aligns) {
      if (this.rules.other.tableAlignRight.test(align)) {
        item.align.push("right");
      } else if (this.rules.other.tableAlignCenter.test(align)) {
        item.align.push("center");
      } else if (this.rules.other.tableAlignLeft.test(align)) {
        item.align.push("left");
      } else {
        item.align.push(null);
      }
    }
    for (let i = 0; i < headers.length; i++) {
      item.header.push({
        text: headers[i],
        tokens: this.lexer.inline(headers[i]),
        header: true,
        align: item.align[i]
      });
    }
    for (const row of rows) {
      item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
        return {
          text: cell,
          tokens: this.lexer.inline(cell),
          header: false,
          align: item.align[i]
        };
      }));
    }
    return item;
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: cap[1]
      };
    }
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && this.rules.other.startATag.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && this.rules.other.endATag.test(cap[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(cap[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap[0]
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(trimmedUrl)) {
        if (!this.rules.other.endAngleBracket.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex === -2) {
          return;
        }
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link2 = this.rules.other.pedanticHrefTitle.exec(href);
        if (link2) {
          href = link2[1];
          title = link2[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (this.rules.other.startAngleBracket.test(href)) {
        if (this.options.pedantic && !this.rules.other.endAngleBracket.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
        title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
      }, cap[0], this.lexer, this.rules);
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      const linkString = (cap[2] || cap[1]).replace(this.rules.other.multipleSpaceGlobal, " ");
      const link2 = links[linkString.toLowerCase()];
      if (!link2) {
        const text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap, link2, cap[0], this.lexer, this.rules);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match) return;
    if (match[3] && prevChar.match(this.rules.other.unicodeAlphaNumeric)) return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      const lLength = [...match[0]].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) continue;
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const lastCharLength = [...match[0]][0].length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(this.rules.other.newLineCharGlobal, " ");
      const hasNonSpaceChars = this.rules.other.nonSpaceChar.test(text);
      const hasSpaceCharsOnBothEnds = this.rules.other.startingSpaceChar.test(text) && this.rules.other.endingSpaceChar.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      return {
        type: "codespan",
        raw: cap[0],
        text
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  autolink(src) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text, href;
      if (cap[2] === "@") {
        text = cap[1];
        href = "mailto:" + text;
      } else {
        text = cap[1];
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  url(src) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap[2] === "@") {
        text = cap[0];
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
        } while (prevCapZero !== cap[0]);
        text = cap[0];
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  inlineText(src) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      const escaped = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        escaped
      };
    }
  }
};
var _Lexer = class __Lexer {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(options2) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options2 || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      other,
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options2) {
    const lexer2 = new __Lexer(options2);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(other.carriageReturn, "\n");
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const next = this.inlineQueue[i];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
  blockTokens(src, tokens = [], lastParagraphClipped = false) {
    if (this.options.pedantic) {
      src = src.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "");
    }
    while (src) {
      let token;
      if (this.options.extensions?.block?.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (token.raw.length === 1 && lastToken !== void 0) {
          lastToken.raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "paragraph" || lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue.at(-1).src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        const lastToken = tokens.at(-1);
        if (lastParagraphClipped && lastToken?.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue.at(-1).src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let maskedSrc = src;
    let match = null;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    let keepPrevChar = false;
    let prevChar = "";
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      let token;
      if (this.options.extensions?.inline?.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.at(-1);
        if (token.type === "text" && lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      let cutSrc = src;
      if (this.options.extensions?.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var _Renderer = class {
  options;
  parser;
  // set by the parser
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  space(token) {
    return "";
  }
  code({ text, lang, escaped }) {
    const langString = (lang || "").match(other.notSpaceStart)?.[0];
    const code = text.replace(other.endingNewline, "") + "\n";
    if (!langString) {
      return "<pre><code>" + (escaped ? code : escape2(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="language-' + escape2(langString) + '">' + (escaped ? code : escape2(code, true)) + "</code></pre>\n";
  }
  blockquote({ tokens }) {
    const body = this.parser.parse(tokens);
    return `<blockquote>
${body}</blockquote>
`;
  }
  html({ text }) {
    return text;
  }
  heading({ tokens, depth }) {
    return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
  }
  hr(token) {
    return "<hr>\n";
  }
  list(token) {
    const ordered = token.ordered;
    const start = token.start;
    let body = "";
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j];
      body += this.listitem(item);
    }
    const type = ordered ? "ol" : "ul";
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startAttr + ">\n" + body + "</" + type + ">\n";
  }
  listitem(item) {
    let itemBody = "";
    if (item.task) {
      const checkbox = this.checkbox({ checked: !!item.checked });
      if (item.loose) {
        if (item.tokens[0]?.type === "paragraph") {
          item.tokens[0].text = checkbox + " " + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
            item.tokens[0].tokens[0].text = checkbox + " " + escape2(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else {
          item.tokens.unshift({
            type: "text",
            raw: checkbox + " ",
            text: checkbox + " ",
            escaped: true
          });
        }
      } else {
        itemBody += checkbox + " ";
      }
    }
    itemBody += this.parser.parse(item.tokens, !!item.loose);
    return `<li>${itemBody}</li>
`;
  }
  checkbox({ checked }) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens }) {
    return `<p>${this.parser.parseInline(tokens)}</p>
`;
  }
  table(token) {
    let header = "";
    let cell = "";
    for (let j = 0; j < token.header.length; j++) {
      cell += this.tablecell(token.header[j]);
    }
    header += this.tablerow({ text: cell });
    let body = "";
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j];
      cell = "";
      for (let k = 0; k < row.length; k++) {
        cell += this.tablecell(row[k]);
      }
      body += this.tablerow({ text: cell });
    }
    if (body) body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  tablerow({ text }) {
    return `<tr>
${text}</tr>
`;
  }
  tablecell(token) {
    const content = this.parser.parseInline(token.tokens);
    const type = token.header ? "th" : "td";
    const tag2 = token.align ? `<${type} align="${token.align}">` : `<${type}>`;
    return tag2 + content + `</${type}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens }) {
    return `<strong>${this.parser.parseInline(tokens)}</strong>`;
  }
  em({ tokens }) {
    return `<em>${this.parser.parseInline(tokens)}</em>`;
  }
  codespan({ text }) {
    return `<code>${escape2(text, true)}</code>`;
  }
  br(token) {
    return "<br>";
  }
  del({ tokens }) {
    return `<del>${this.parser.parseInline(tokens)}</del>`;
  }
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + escape2(title) + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  image({ href, title, text, tokens }) {
    if (tokens) {
      text = this.parser.parseInline(tokens, this.parser.textRenderer);
    }
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return escape2(text);
    }
    href = cleanHref;
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${escape2(title)}"`;
    }
    out += ">";
    return out;
  }
  text(token) {
    return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : "escaped" in token && token.escaped ? token.text : escape2(token.text);
  }
};
var _TextRenderer = class {
  // no need for block level renderers
  strong({ text }) {
    return text;
  }
  em({ text }) {
    return text;
  }
  codespan({ text }) {
    return text;
  }
  del({ text }) {
    return text;
  }
  html({ text }) {
    return text;
  }
  text({ text }) {
    return text;
  }
  link({ text }) {
    return "" + text;
  }
  image({ text }) {
    return "" + text;
  }
  br() {
    return "";
  }
};
var _Parser = class __Parser {
  options;
  renderer;
  textRenderer;
  constructor(options2) {
    this.options = options2 || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.renderer.parser = this;
    this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options2) {
    const parser2 = new __Parser(options2);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top2 = true) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const genericToken = anyToken;
        const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(genericToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "space": {
          out += this.renderer.space(token);
          continue;
        }
        case "hr": {
          out += this.renderer.hr(token);
          continue;
        }
        case "heading": {
          out += this.renderer.heading(token);
          continue;
        }
        case "code": {
          out += this.renderer.code(token);
          continue;
        }
        case "table": {
          out += this.renderer.table(token);
          continue;
        }
        case "blockquote": {
          out += this.renderer.blockquote(token);
          continue;
        }
        case "list": {
          out += this.renderer.list(token);
          continue;
        }
        case "html": {
          out += this.renderer.html(token);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(token);
          continue;
        }
        case "text": {
          let textToken = token;
          let body = this.renderer.text(textToken);
          while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            textToken = tokens[++i];
            body += "\n" + this.renderer.text(textToken);
          }
          if (top2) {
            out += this.renderer.paragraph({
              type: "paragraph",
              raw: body,
              text: body,
              tokens: [{ type: "text", raw: body, text: body, escaped: true }]
            });
          } else {
            out += body;
          }
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer = this.renderer) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const anyToken = tokens[i];
      if (this.options.extensions?.renderers?.[anyToken.type]) {
        const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(anyToken.type)) {
          out += ret || "";
          continue;
        }
      }
      const token = anyToken;
      switch (token.type) {
        case "escape": {
          out += renderer.text(token);
          break;
        }
        case "html": {
          out += renderer.html(token);
          break;
        }
        case "link": {
          out += renderer.link(token);
          break;
        }
        case "image": {
          out += renderer.image(token);
          break;
        }
        case "strong": {
          out += renderer.strong(token);
          break;
        }
        case "em": {
          out += renderer.em(token);
          break;
        }
        case "codespan": {
          out += renderer.codespan(token);
          break;
        }
        case "br": {
          out += renderer.br(token);
          break;
        }
        case "del": {
          out += renderer.del(token);
          break;
        }
        case "text": {
          out += renderer.text(token);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var _Hooks = class {
  options;
  block;
  constructor(options2) {
    this.options = options2 || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html2) {
    return html2;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens) {
    return tokens;
  }
  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
};
var Marked = class {
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...args) {
    this.use(...args);
  }
  /**
   * Run callback for every token
   */
  walkTokens(tokens, callback) {
    let values = [];
    for (const token of tokens) {
      values = values.concat(callback.call(this, token));
      switch (token.type) {
        case "table": {
          const tableToken = token;
          for (const cell of tableToken.header) {
            values = values.concat(this.walkTokens(cell.tokens, callback));
          }
          for (const row of tableToken.rows) {
            for (const cell of row) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
          }
          break;
        }
        case "list": {
          const listToken = token;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          const genericToken = token;
          if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              const tokens2 = genericToken[childTokens].flat(Infinity);
              values = values.concat(this.walkTokens(tokens2, callback));
            });
          } else if (genericToken.tokens) {
            values = values.concat(this.walkTokens(genericToken.tokens, callback));
          }
        }
      }
    }
    return values;
  }
  use(...args) {
    const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
    args.forEach((pack) => {
      const opts = { ...pack };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if ("renderer" in ext) {
            const prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if ("tokenizer" in ext) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            const extLevel = extensions[ext.level];
            if (extLevel) {
              extLevel.unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === "inline") {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if ("childTokens" in ext && ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        const renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (const prop in pack.renderer) {
          if (!(prop in renderer)) {
            throw new Error(`renderer '${prop}' does not exist`);
          }
          if (["options", "parser"].includes(prop)) {
            continue;
          }
          const rendererProp = prop;
          const rendererFunc = pack.renderer[rendererProp];
          const prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args2) => {
            let ret = rendererFunc.apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const prop in pack.tokenizer) {
          if (!(prop in tokenizer)) {
            throw new Error(`tokenizer '${prop}' does not exist`);
          }
          if (["options", "rules", "lexer"].includes(prop)) {
            continue;
          }
          const tokenizerProp = prop;
          const tokenizerFunc = pack.tokenizer[tokenizerProp];
          const prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args2) => {
            let ret = tokenizerFunc.apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        const hooks = this.defaults.hooks || new _Hooks();
        for (const prop in pack.hooks) {
          if (!(prop in hooks)) {
            throw new Error(`hook '${prop}' does not exist`);
          }
          if (["options", "block"].includes(prop)) {
            continue;
          }
          const hooksProp = prop;
          const hooksFunc = pack.hooks[hooksProp];
          const prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop)) {
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async) {
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret2) => {
                  return prevHook.call(hooks, ret2);
                });
              }
              const ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          } else {
            hooks[hooksProp] = (...args2) => {
              let ret = hooksFunc.apply(hooks, args2);
              if (ret === false) {
                ret = prevHook.apply(hooks, args2);
              }
              return ret;
            };
          }
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        const walkTokens2 = this.defaults.walkTokens;
        const packWalktokens = pack.walkTokens;
        opts.walkTokens = function(token) {
          let values = [];
          values.push(packWalktokens.call(this, token));
          if (walkTokens2) {
            values = values.concat(walkTokens2.call(this, token));
          }
          return values;
        };
      }
      this.defaults = { ...this.defaults, ...opts };
    });
    return this;
  }
  setOptions(opt) {
    this.defaults = { ...this.defaults, ...opt };
    return this;
  }
  lexer(src, options2) {
    return _Lexer.lex(src, options2 ?? this.defaults);
  }
  parser(tokens, options2) {
    return _Parser.parse(tokens, options2 ?? this.defaults);
  }
  parseMarkdown(blockType) {
    const parse2 = (src, options2) => {
      const origOpt = { ...options2 };
      const opt = { ...this.defaults, ...origOpt };
      const throwError = this.onError(!!opt.silent, !!opt.async);
      if (this.defaults.async === true && origOpt.async === false) {
        return throwError(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      }
      if (typeof src === "undefined" || src === null) {
        return throwError(new Error("marked(): input parameter is undefined or null"));
      }
      if (typeof src !== "string") {
        return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
      }
      if (opt.hooks) {
        opt.hooks.options = opt;
        opt.hooks.block = blockType;
      }
      const lexer2 = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
      const parser2 = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
      if (opt.async) {
        return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then((tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html2) => opt.hooks ? opt.hooks.postprocess(html2) : html2).catch(throwError);
      }
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        let tokens = lexer2(src, opt);
        if (opt.hooks) {
          tokens = opt.hooks.processAllTokens(tokens);
        }
        if (opt.walkTokens) {
          this.walkTokens(tokens, opt.walkTokens);
        }
        let html2 = parser2(tokens, opt);
        if (opt.hooks) {
          html2 = opt.hooks.postprocess(html2);
        }
        return html2;
      } catch (e) {
        return throwError(e);
      }
    };
    return parse2;
  }
  onError(silent, async) {
    return (e) => {
      e.message += "\nPlease report this to https://github.com/markedjs/marked.";
      if (silent) {
        const msg = "<p>An error occurred:</p><pre>" + escape2(e.message + "", true) + "</pre>";
        if (async) {
          return Promise.resolve(msg);
        }
        return msg;
      }
      if (async) {
        return Promise.reject(e);
      }
      throw e;
    };
  }
};
var markedInstance = new Marked();
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
marked.options = marked.setOptions = function(options2) {
  markedInstance.setOptions(options2);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.walkTokens = function(tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = _Parser.parse;
var lexer = _Lexer.lex;

// src/panel/components/MarkdownPreview.ts
function renderMarkdownPreview(target, source) {
  const excerpt = source.slice(0, 3e3).split(/\r?\n/).slice(0, 64).join("\n");
  let budget = 200;
  const text = (value) => document.createTextNode(value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    const names = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    if (entity[0] !== "#") return names[entity.toLowerCase()] ?? "";
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 1114111 && !(code >= 55296 && code <= 57343) ? String.fromCodePoint(code) : "";
  }));
  function render(tokens, parent, depth = 0) {
    if (depth > 12) return;
    for (const token of tokens) {
      if (--budget < 0) return;
      const nested = (node, children) => {
        render(children, node, depth + 1);
        parent.append(node);
      };
      switch (token.type) {
        case "heading": {
          const t = token;
          const node = el(t.depth <= 1 ? "h3" : "h4");
          nested(node, t.tokens);
          break;
        }
        case "paragraph":
          nested(el("p"), token.tokens);
          break;
        case "strong":
          nested(el("strong"), token.tokens);
          break;
        case "em":
          nested(el("em"), token.tokens);
          break;
        case "del":
          nested(el("s"), token.tokens);
          break;
        case "blockquote":
          nested(el("blockquote"), token.tokens);
          break;
        case "code": {
          const node = el("pre");
          node.append(el("code", token.text));
          parent.append(node);
          break;
        }
        case "codespan":
          parent.append(el("code", token.text));
          break;
        case "br":
          parent.append(el("br"));
          break;
        case "hr":
          parent.append(el("hr"));
          break;
        case "link":
          nested(el("span", "", "markdown-link"), token.tokens);
          break;
        case "image": {
          const node = el("span", "", "markdown-image");
          node.append(icon("image"), text(token.text || "Image reference"));
          parent.append(node);
          break;
        }
        case "list": {
          const t = token, node = el(t.ordered ? "ol" : "ul");
          if (node instanceof HTMLOListElement && typeof t.start === "number") node.start = t.start;
          for (const item of t.items.slice(0, 12)) {
            if (--budget < 0) break;
            const li = el("li");
            if (item.task) {
              li.className = "markdown-task";
              const mark = el("span", item.checked ? "\u2611" : "\u2610");
              mark.setAttribute("aria-label", item.checked ? "Completed" : "Incomplete");
              li.append(mark);
            }
            render(item.tokens, li, depth + 1);
            node.append(li);
          }
          parent.append(node);
          break;
        }
        case "table": {
          const t = token, table = el("table"), head = el("thead"), row = el("tr");
          for (const cell of t.header.slice(0, 4)) {
            const th = el("th");
            render(cell.tokens, th, depth + 1);
            row.append(th);
          }
          head.append(row);
          table.append(head);
          const body = el("tbody");
          for (const cells of t.rows.slice(0, 4)) {
            const tr = el("tr");
            for (const cell of cells.slice(0, 4)) {
              const td = el("td");
              render(cell.tokens, td, depth + 1);
              tr.append(td);
            }
            body.append(tr);
          }
          table.append(body);
          parent.append(table);
          break;
        }
        case "text": {
          const t = token;
          if (t.tokens) render(t.tokens, parent, depth + 1);
          else parent.append(text(t.text));
          break;
        }
        case "escape":
          parent.append(text(token.text));
          break;
        case "html":
        case "def":
        case "space":
          break;
        default:
          parent.append(text(token.raw));
      }
    }
  }
  target.replaceChildren();
  render(marked.lexer(excerpt, { gfm: true }), target);
  if (!target.textContent?.trim()) target.append(el("p", "No text to preview. Open the file to view this document."));
}

// src/panel/components/ScrollFrame.ts
function scrollFrame(scroller2, className) {
  const element = el("div", "", "scroll-frame " + className), scrollbar = el("div", "", "scrollbar"), thumb = el("div", "", "scroll-thumb");
  scrollbar.setAttribute("aria-hidden", "true");
  scrollbar.append(thumb);
  element.append(scroller2, scrollbar);
  let frame = 0, disposed = false, drag;
  const update = () => {
    if (disposed) return;
    const overflow = Math.max(0, scroller2.scrollHeight - scroller2.clientHeight), top2 = Math.max(0, Math.min(overflow, scroller2.scrollTop));
    element.classList.toggle("can-scroll-down", overflow - top2 > 1);
    element.classList.toggle("is-scrollable", overflow > 1);
    const height = Math.min(scrollbar.clientHeight, Math.max(24, scrollbar.clientHeight * scroller2.clientHeight / Math.max(1, scroller2.scrollHeight)));
    thumb.style.height = height + "px";
    thumb.style.transform = "translateY(" + (overflow > 0 ? top2 / overflow * (scrollbar.clientHeight - height) : 0) + "px)";
  };
  const schedule = () => {
    if (disposed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  scrollbar.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const travel = scrollbar.clientHeight - thumb.clientHeight;
    if (e.target !== thumb && travel > 0) {
      const y = e.clientY - scrollbar.getBoundingClientRect().top - thumb.clientHeight / 2;
      scroller2.scrollTop = Math.max(0, Math.min(1, y / travel)) * (scroller2.scrollHeight - scroller2.clientHeight);
      update();
    }
    drag = { clientY: e.clientY, scrollTop: scroller2.scrollTop };
    element.classList.add("is-dragging");
    scrollbar.setPointerCapture(e.pointerId);
  };
  scrollbar.onpointermove = (e) => {
    if (!drag) return;
    const travel = scrollbar.clientHeight - thumb.clientHeight;
    if (travel > 0) scroller2.scrollTop = drag.scrollTop + (e.clientY - drag.clientY) / travel * (scroller2.scrollHeight - scroller2.clientHeight);
  };
  scrollbar.onpointerup = scrollbar.onpointercancel = scrollbar.onlostpointercapture = () => {
    drag = void 0;
    element.classList.remove("is-dragging");
  };
  const resize = new ResizeObserver(schedule);
  const observe = () => {
    resize.disconnect();
    resize.observe(scroller2);
    for (const child of scroller2.children) resize.observe(child);
    schedule();
  };
  const mutation = new MutationObserver(observe);
  mutation.observe(scroller2, { childList: true });
  scroller2.addEventListener("scroll", schedule, { passive: true });
  observe();
  return { element, update, dispose: () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    mutation.disconnect();
    scroller2.removeEventListener("scroll", schedule);
    scrollbar.onpointerdown = scrollbar.onpointermove = scrollbar.onpointerup = scrollbar.onpointercancel = scrollbar.onlostpointercapture = null;
  } };
}

// src/panel/components/AssetInspector.ts
function inspector(a, back, copy2, open2, explorer, load, report2) {
  const section = el("section", "", "inspector");
  section.setAttribute("aria-label", "Asset inspector");
  const heading2 = el("div", "", "inspector-heading");
  const backButton = button("All Assets", back, "text-button", "back");
  heading2.append(backButton, el("span", assetTypeLabel(a), "micro muted"));
  const stage = el("div", "", "preview-stage checker");
  stage.tabIndex = 0;
  stage.setAttribute("aria-label", "Asset preview. Use zoom controls, then drag to pan.");
  const isHtml = a.mimeType === "text/html", isDocument = isHtml || a.mimeType === "text/markdown", isVideo = a.mimeType.startsWith("video/"), documentPreview = el("div", "", "markdown-preview");
  documentPreview.setAttribute("aria-label", isHtml ? "HTML source preview" : "Markdown preview");
  if (isDocument) {
    stage.classList.remove("checker");
    stage.classList.add("document-stage");
    stage.setAttribute("aria-label", "Document preview");
    stage.setAttribute("role", "region");
    stage.append(documentPreview);
  }
  const video = isVideo ? el("video") : void 0;
  if (video) {
    stage.classList.remove("checker");
    stage.classList.add("video-stage");
    stage.tabIndex = -1;
    stage.setAttribute("aria-label", "Video preview");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", "Video preview for " + a.filename);
    video.hidden = true;
  }
  const image = el("img");
  image.alt = a.filename;
  image.draggable = false;
  const status = el("div", a.status === "missing" ? "Original file unavailable" : isDocument ? "Loading document preview\u2026" : isVideo ? "Loading video preview\u2026" : "Loading full preview\u2026", "placeholder");
  stage.append(status, video ?? image);
  image.hidden = true;
  const documentScroll = isDocument ? scrollFrame(stage, "document-preview-frame") : void 0;
  let scale = 1, x = 0, y = 0, drag = null, url = "", disposed = false;
  const update = () => {
    image.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
    zoomLabel.textContent = Math.round(scale * 100) + "%";
  };
  const controls2 = el("div", "", "preview-controls"), zoomLabel = el("span", "100%", "micro");
  const fit = () => {
    scale = 1;
    x = y = 0;
    update();
  };
  controls2.append(iconButton("Fit to view", "fit", fit), iconButton("Zoom out", "minus", () => {
    scale = Math.max(0.5, scale - 0.25);
    update();
  }), zoomLabel, iconButton("Zoom in", "zoom", () => {
    scale = Math.min(5, scale + 0.25);
    update();
  }), iconButton("Toggle transparency background", "grid", () => stage.classList.toggle("checker")));
  stage.onpointerdown = (e) => {
    if (scale <= 1) return;
    drag = { x: e.clientX - x, y: e.clientY - y };
    stage.setPointerCapture(e.pointerId);
  };
  stage.onpointermove = (e) => {
    if (drag) {
      x = e.clientX - drag.x;
      y = e.clientY - drag.y;
      update();
    }
  };
  stage.onpointerup = () => drag = null;
  stage.onkeydown = (e) => {
    if (isDocument || isVideo) return;
    if (e.key === "0") {
      fit();
      return;
    }
    if (scale <= 1) return;
    const d = 24;
    if (e.key === "ArrowLeft") x += d;
    else if (e.key === "ArrowRight") x -= d;
    else if (e.key === "ArrowUp") y += d;
    else if (e.key === "ArrowDown") y -= d;
    else return;
    e.preventDefault();
    update();
  };
  const title = el("h2", a.filename), sub = el("p", (a.width && a.height ? a.width + " \xD7 " + a.height + " \xB7 " : "") + assetTypeLabel(a) + " \xB7 " + bytes(a.sizeBytes), "muted");
  const actions = el("div", "", "inspector-actions");
  const openButton = button("Open file", open2, "primary", "open");
  openButton.disabled = a.status === "missing";
  actions.append(openButton, button("Copy reference", () => copy2((isDocument || isVideo ? "[" : "![") + a.filename.replace(/[\[\]]/g, "") + "](" + encodeURI(a.relativePath).replace(/[()]/g, (c) => "%" + c.charCodeAt(0).toString(16)) + ")"), "secondary", "copy"));
  const details = el("dl", "", "metadata");
  for (const [label, value] of [["Path", a.relativePath], ["Worktree", a.worktreeName], ["Agent", a.agent ?? "Unavailable"], ["Tool", a.tool ?? "Unavailable"], ["Updated", new Date(a.updatedAt).toLocaleString()], ["Version", String(a.version)], ["Status", a.status]]) {
    details.append(el("dt", label), el("dd", value));
  }
  const paths2 = el("div", "", "path-actions");
  paths2.append(button("Copy relative path", () => copy2(a.relativePath), "text-button"), button("Copy absolute path", () => copy2(a.absolutePath), "text-button"), button("Open in Explorer", explorer, "text-button", "folder"), button("View original resolution", () => {
    scale = Math.min(5, (a.width ?? stage.clientWidth) / Math.max(1, stage.clientWidth));
    update();
  }, "text-button", "expand"));
  section.append(heading2, documentScroll?.element ?? stage, ...isVideo ? [] : isDocument ? [el("p", isHtml ? "HTML source preview \xB7 Open file to view the page." : "Document preview \xB7 Open file to read the full document.", "note")] : [controls2], title, sub, actions, details, paths2);
  if (isDocument || isVideo) paths2.lastElementChild?.remove();
  if (a.mimeType === "image/svg+xml") section.append(el("p", "SVG preview removes scripts, external resources, styles and unsupported elements. Open the original to inspect its full source.", "note"));
  let videoTimer;
  const videoUnavailable = () => {
    clearTimeout(videoTimer);
    if (disposed) return;
    if (video) video.hidden = true;
    status.hidden = false;
    status.textContent = "Video preview unavailable in this browser. Open file in Orca.";
  };
  if (video && a.status !== "missing" && !video.canPlayType(a.mimeType)) videoUnavailable();
  else if (a.status !== "missing") void load().then((value) => {
    if (disposed || !section.isConnected) {
      if (!isDocument) URL.revokeObjectURL(value);
      return;
    }
    if (isDocument) {
      if (isHtml) {
        const pre = el("pre");
        pre.append(el("code", value.slice(0, 3e3).split(/\r?\n/).slice(0, 64).join("\n")));
        documentPreview.replaceChildren(pre);
      } else renderMarkdownPreview(documentPreview, value);
      status.hidden = true;
      documentScroll?.update();
    } else if (video) {
      url = value;
      videoTimer = setTimeout(videoUnavailable, 8e3);
      video.onloadedmetadata = () => {
        clearTimeout(videoTimer);
        if (disposed) return;
        if (!video.videoWidth || !video.videoHeight || video.videoWidth * video.videoHeight > 4e7) {
          videoUnavailable();
          return;
        }
        video.hidden = false;
        status.hidden = true;
      };
      video.onerror = videoUnavailable;
      video.src = value;
    } else {
      url = value;
      image.onload = () => {
        image.hidden = false;
        status.hidden = true;
      };
      image.onerror = () => {
        status.textContent = "Preview unavailable. Open the original file.";
      };
      image.src = value;
    }
  }).catch((e) => {
    if (disposed) return;
    if (video) videoUnavailable();
    else status.textContent = "Preview unavailable. Open the original file.";
    report2(e);
  });
  return { section, backButton, dispose: () => {
    disposed = true;
    clearTimeout(videoTimer);
    documentScroll?.dispose();
    if (video) {
      video.onloadedmetadata = video.onerror = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (url) URL.revokeObjectURL(url);
  } };
}

// src/panel/components/BrowserThumbnail.ts
async function browserThumbnail(asset, loadOriginal2) {
  const preview = await orca.plugin.request("library.thumbnail", { id: asset.id });
  if (preview.error) throw new Error(preview.error);
  if (preview.data?.startsWith("data:image/webp;base64,")) return preview.data;
  let url = "";
  const isVideo = asset.mimeType.startsWith("video/"), image = new Image(), video = isVideo ? document.createElement("video") : void 0;
  image.decoding = "async";
  if (video) {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!video.canPlayType(asset.mimeType)) throw new Error("Video format is not supported by this browser");
  }
  try {
    if (preview.needsOriginal) url = await loadOriginal2(asset);
    else if (preview.data) {
      const match = /^data:(image\/(?:png|jpeg|webp|gif|avif|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})$/.exec(preview.data);
      if (!match) throw new Error("Invalid preview data");
      const bytes2 = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      url = URL.createObjectURL(new Blob([bytes2], { type: match[1] }));
    } else throw new Error("Preview unavailable");
    if (video) {
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          clearTimeout(timer);
          video.onloadeddata = video.onerror = null;
          error ? reject(error) : resolve();
        };
        const timer = setTimeout(() => finish(new Error("Video thumbnail timed out")), 8e3);
        video.onloadeddata = () => finish();
        video.onerror = () => finish(new Error("Video codec is not supported by this browser"));
        video.src = url;
      });
    } else {
      image.src = url;
      await image.decode();
    }
    const width = video ? video.videoWidth : image.naturalWidth, height = video ? video.videoHeight : image.naturalHeight;
    if (!width || !height || width * height > 4e7) throw new Error("Asset exceeds preview dimensions");
    const ratio = Math.min(1, 480 / width, 480 / height), canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context2 = canvas.getContext("2d");
    if (!context2) throw new Error("Browser preview unavailable");
    context2.drawImage(video ?? image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.78);
    canvas.width = canvas.height = 0;
    if (data.length > 2e5) throw new Error("Thumbnail exceeds cache limit");
    try {
      await orca.plugin.request("library.cacheThumbnail", { id: asset.id, contentHash: asset.contentHash, data });
    } catch {
    }
    return data;
  } finally {
    image.src = "";
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (url) URL.revokeObjectURL(url);
  }
}

// src/panel/components/ProjectBadge.ts
var glyphs = { box: "project-box", sparkles: "project-sparkles", code2: "project-code", codexml: "project-code", folder: "folder", book: "book", layers: "layers", blocks: "blocks", image: "image", video: "video", search: "search", settings: "settings", info: "info", copy: "copy" };
function projectBadge(appearance) {
  if (!appearance) return;
  const color = appearance.color && /^#[a-f0-9]{6}$/i.test(appearance.color) ? appearance.color : void 0;
  const name = appearance.iconName?.replace(/[-_]/g, "").toLowerCase() ?? "", glyph = Object.hasOwn(glyphs, name) ? glyphs[name] : void 0;
  if (!glyph && !color) return;
  const badge = glyph ? icon(glyph) : el("span", "", "project-color-dot");
  badge.classList.add("project-badge");
  badge.setAttribute("aria-hidden", "true");
  if (color) badge.style.color = color;
  return badge;
}

// src/panel/index.ts
var app = document.querySelector("#app");
var scope = "worktree";
var mode = "generated";
var refreshing = false;
var assetTotal;
var context;
var filter = "all";
var sort = "newest";
var search = "";
var view = "gallery";
var selection;
var detail;
var queryTimer;
var updateTimer;
var toastTimer;
var galleryLayout = "cards";
var activeWorkspaceKey = "";
var savedScroll = /* @__PURE__ */ new Map();
var scrollKey = () => String(context?.active?.id ?? "none") + ":" + mode;
var top = el("header", "", "topbar");
var brand = el("div", "", "brand");
var toolbar = el("div", "", "toolbar");
var brandIcon = el("img");
brandIcon.src = "data:image/png;base64,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";
brandIcon.alt = "";
brand.append(brandIcon, el("h1", "Assets Library"));
top.append(brand, toolbar, el("p", "Generated assets by agents in the worktree.", "header-subtitle note"));
var controls = el("div", "", "controls");
var worktreeContext = el("div", "", "worktree-context");
worktreeContext.setAttribute("aria-label", "Current worktree");
var scroller = el("main");
scroller.id = "scroller";
var searchRow = el("div", "", "search-row");
var count = el("span", "Loading assets\u2026", "asset-count micro");
var footer = el("footer", "", "footer");
var assetsFrame = scrollFrame(scroller, "assets-scroll-frame");
window.addEventListener("pagehide", () => assetsFrame.dispose(), { once: true });
var toast = el("div");
toast.id = "toast";
toast.hidden = true;
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
app.append(top, controls, searchRow, assetsFrame.element, footer, toast);
function report(e) {
  const text = e instanceof Error ? e.message : String(e);
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.hidden = true, 4500);
}
async function perform(work) {
  try {
    await work();
  } catch (e) {
    report(e);
  }
}
function query() {
  return { scope, mode, filter, sort, search };
}
function isRefreshing() {
  return refreshing || !!context?.refreshing || context?.collectionProgress?.status === "running";
}
function drawAssetCount() {
  count.textContent = isRefreshing() ? "Refreshing" : assetTotal === void 0 ? "Loading assets\u2026" : assetTotal + " " + (assetTotal === 1 ? "asset" : "assets");
}
async function savePrefs() {
  await orca.storage.set("panel.preferences.v1", { scope, mode, filter, filterVersion: 2, sort, galleryLayout });
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = el("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    if (!document.execCommand("copy")) {
      area.remove();
      throw new Error("Clipboard unavailable");
    }
    area.remove();
  }
  report("Copied to clipboard");
}
var open = (a) => void perform(async () => {
  const result = await orca.plugin.request("library.action", { id: a.id, action: "open" });
  if (result.message) report(result.message);
});
async function loadOriginal(a) {
  const chunks = [];
  let offset = 0, total = 0, mime = a.mimeType, contentHash = a.contentHash;
  do {
    const result = await orca.plugin.request("library.preview", { id: a.id, offset, contentHash });
    if (result.error || !result.data) throw new Error(result.error ?? "Original unavailable");
    if (result.contentHash !== contentHash) throw new Error("Asset changed while loading");
    mime = result.mimeType;
    total = result.totalBytes ?? 0;
    if (!Number.isInteger(total) || total < 1 || total > 16 * 1024 * 1024) throw new Error("Original exceeds preview limit");
    const raw = atob(result.data), bytes2 = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    chunks.push(bytes2);
    offset += bytes2.length;
    if (!bytes2.length || offset > total) throw new Error("Incomplete preview");
  } while (offset < total);
  return URL.createObjectURL(new Blob(chunks, { type: mime }));
}
var thumbActive = 0;
var thumbQueue = [];
var thumbnailCache = /* @__PURE__ */ new Map();
function pump() {
  while (thumbActive < 2 && thumbQueue.length) {
    const task = thumbQueue.shift();
    thumbActive++;
    void task().finally(() => {
      thumbActive--;
      pump();
    });
  }
}
function thumbnail(a, img, placeholder) {
  const cached = thumbnailCache.get(a.contentHash);
  const unavailable = () => {
    if (a.mimeType.startsWith("video/")) placeholder.title = "Video preview unavailable in this browser";
    else placeholder.textContent = "Preview unavailable";
  };
  const show = (data) => {
    if (!img.isConnected) return;
    img.onload = () => {
      img.hidden = false;
      placeholder.hidden = true;
    };
    img.onerror = unavailable;
    img.src = data;
  };
  if (cached) {
    requestAnimationFrame(() => show(cached));
    return;
  }
  thumbQueue.push(async () => {
    if (!img.isConnected) return;
    try {
      const data = await browserThumbnail(a, loadOriginal);
      thumbnailCache.set(a.contentHash, data);
      if (thumbnailCache.size > 160) thumbnailCache.delete(thumbnailCache.keys().next().value);
      show(data);
    } catch {
      unavailable();
    }
  });
  requestAnimationFrame(pump);
}
var grid = new AssetGrid(scroller, query, (q) => orca.plugin.request("library.list", q), showInspector, open, thumbnail, (n) => {
  assetTotal = n;
  drawAssetCount();
  if (view === "gallery") {
    empty.hidden = n > 0;
    grid.element.hidden = n === 0;
  }
}, report);
var viewSwitcher = el("div", "", "view-switcher");
viewSwitcher.setAttribute("role", "group");
viewSwitcher.setAttribute("aria-label", "Gallery view");
for (const [value, label, glyph] of [["cards", "Cards view", "grid"], ["list", "List view", "list"]]) {
  const b = iconButton(label, glyph, () => {
    galleryLayout = value;
    grid.setLayout(value);
    updateViewButtons();
    void perform(savePrefs);
  });
  b.dataset.layout = value;
  viewSwitcher.append(b);
}
function updateViewButtons() {
  for (const b of viewSwitcher.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.layout === galleryLayout));
}
var searchField = el("div", "", "search-field");
var searchInput = el("input", "", "header-search");
searchInput.type = "search";
searchInput.id = "asset-search";
searchInput.placeholder = "Search assets";
searchInput.setAttribute("aria-label", "Search assets");
count.setAttribute("role", "status");
count.setAttribute("aria-atomic", "true");
searchInput.oninput = () => {
  search = searchInput.value;
  clearTimeout(queryTimer);
  queryTimer = setTimeout(() => void perform(async () => {
    await reload();
    drawControls();
  }), 120);
};
var galleryTools = el("div", "", "gallery-tools");
var sortControl = select("Sort assets", [["newest", "Newest first"], ["oldest", "Oldest first"], ["filename", "Filename"], ["size", "File size"]], sort, (v) => {
  sort = v;
  void perform(async () => {
    await savePrefs();
    await reload();
  });
});
searchField.append(icon("search"), searchInput);
galleryTools.append(viewSwitcher, sortControl);
searchRow.append(searchField, galleryTools);
function drawSearchHeader() {
  if (searchInput.value !== search) searchInput.value = search;
  sortControl.value = sort;
  updateViewButtons();
}
function clearSearch() {
  search = "";
  clearTimeout(queryTimer);
  drawControls();
  void perform(() => reload());
}
var empty = el("div", "", "empty");
var emptySymbol = el("div", "", "empty-symbol");
var emptyTitle = el("h2", "Nothing generated yet");
var emptyDescription = el("p", "Images, videos, Markdown and HTML created by your agents will appear here automatically.", "muted");
emptySymbol.append(icon("layers"));
var emptyRefresh = button("Check for generated assets", () => void perform(refreshGenerated), "secondary", "refresh");
empty.append(emptySymbol, emptyTitle, emptyDescription, emptyRefresh);
var loading = el("div", "", "loading-grid");
for (let i = 0; i < 6; i++) loading.append(el("div", "", "skeleton"));
async function reload(preserve = false) {
  if (view !== "gallery") return;
  await grid.reload(preserve);
  loading.remove();
}
var refreshButton = iconButton("Refresh generated assets", "refresh", () => void perform(refreshGenerated));
refreshButton.classList.add("refresh-assets");
var refreshGlyph = refreshButton.querySelector("svg");
var refreshLoader = icon("loader");
refreshLoader.classList.add("refresh-loader");
refreshLoader.setAttribute("hidden", "");
refreshButton.prepend(refreshLoader);
async function refreshGenerated() {
  if (isRefreshing()) return;
  if (!context?.active?.root) {
    report(context?.reason ?? "Open a local worktree first");
    return;
  }
  refreshing = true;
  drawControls();
  try {
    await orca.plugin.request("library.refresh");
    await refreshContext();
    await reload(true);
  } finally {
    refreshing = false;
    drawControls();
  }
}
function drawControls() {
  const oldFilters = controls.querySelector(".filters"), filterScroll = oldFilters?.scrollLeft ?? 0, restoreFilterFocus = !!oldFilters?.contains(document.activeElement);
  controls.replaceChildren();
  const badge = projectBadge(context?.active?.projectAppearance);
  worktreeContext.replaceChildren(...badge ? [badge] : [], el("span", context?.active?.name ?? "No active worktree", "worktree-name"));
  worktreeContext.title = context?.active?.path ?? "";
  const filterRow = el("div", "", "filters");
  filterRow.setAttribute("role", "group");
  filterRow.setAttribute("aria-label", "Asset type");
  for (const [value, label] of [["all", "All"], ["images", "Images"], ["videos", "Videos"], ["markdown", "Markdown"], ["other", "Other"]]) {
    const b = button(label, () => void perform(async () => {
      filter = value;
      drawControls();
      await savePrefs();
      await reload();
    }));
    b.setAttribute("aria-pressed", String(filter === value));
    filterRow.append(b);
  }
  const filtersRow = el("div", "", "filters-row"), summary = el("div", "", "filter-summary");
  summary.append(count, refreshButton);
  filtersRow.append(filterRow, summary);
  controls.append(worktreeContext, filtersRow);
  filterRow.scrollLeft = filterScroll;
  if (restoreFilterFocus) filterRow.querySelector("[aria-pressed=true]")?.focus({ preventScroll: true });
  const busy = isRefreshing();
  refreshButton.disabled = emptyRefresh.disabled = !context?.active?.root || busy;
  refreshButton.setAttribute("aria-busy", String(busy));
  refreshGlyph.toggleAttribute("hidden", busy);
  refreshLoader.toggleAttribute("hidden", !busy);
  drawAssetCount();
  drawSearchHeader();
  emptyTitle.textContent = context?.active?.reason ? "Remote assets unavailable" : !context?.active ? "Open a local workspace" : search || filter !== "all" ? "No matching assets" : "Nothing generated yet";
  emptyDescription.textContent = context?.reason ?? (search || filter !== "all" ? "Try another search or asset type." : "Images, videos, Markdown and HTML created by your agents will appear here automatically.");
  footer.replaceChildren();
  const dot = el("span", "", "live-dot"), version = el("span", "v1.0.0", "footer-version");
  version.title = "Assets Library version 1.0.0";
  version.setAttribute("aria-label", version.title);
  footer.append(dot, el("span", context?.active?.root ? "Collecting automatically \xB7 Current Worktree" : "Local workspace required", "footer-status"), version);
}
toolbar.append(iconButton("Discovery settings", "more", showSettings));
function gallery(restoreFocus = true) {
  detail?.dispose();
  detail = void 0;
  view = "gallery";
  controls.hidden = searchRow.hidden = false;
  scroller.replaceChildren(empty, grid.element);
  scroller.scrollTop = savedScroll.get(scrollKey()) ?? 0;
  drawControls();
  void perform(async () => {
    await reload(true);
    if (restoreFocus && selection) grid.restoreSelection(selection.id);
  });
}
function showInspector(a) {
  selection = a;
  view = "inspector";
  savedScroll.set(scrollKey(), scroller.scrollTop);
  controls.hidden = searchRow.hidden = true;
  detail?.dispose();
  detail = inspector(a, gallery, (t) => void perform(() => copy(t)), () => open(a), () => void perform(async () => {
    const r = await orca.plugin.request("library.action", { id: a.id, action: "explorer" });
    if (r.message) report(r.message);
  }), () => ["text/markdown", "text/html"].includes(a.mimeType) ? orca.plugin.request("library.documentPreview", { id: a.id }).then((r) => r.text) : loadOriginal(a), report);
  scroller.replaceChildren(detail.section);
  scroller.scrollTop = 0;
  detail.backButton.focus();
}
function showSettings() {
  view = "settings";
  controls.hidden = searchRow.hidden = true;
  const page = el("section", "", "settings");
  page.append(button("All assets", gallery, "text-button", "back"), el("h2", "Discovery settings"), el("p", "Defaults work immediately. These settings limit discovery of generated assets within approved roots.", "note"));
  const input = (title, value, multiline = false) => {
    const label = el("label", title), field = multiline ? el("textarea") : el("input");
    field.value = value;
    label.append(field);
    page.append(label);
    return field;
  };
  const s = context?.settings;
  const excluded = input("Excluded folders \xB7 one per line", s?.excludedFolders.join("\n") ?? "", true), size = input("Maximum file size (MB)", String(s?.maxSizeMB ?? 32)), extensions = input("Extensions \xB7 comma separated", s?.extensions.join(", ") ?? "png, jpg, jpeg, webp, svg, gif, avif, md, markdown, mp4, webm, html, htm");
  size.setAttribute("type", "number");
  size.setAttribute("min", "1");
  size.setAttribute("max", "64");
  const unavailable = el("input");
  unavailable.type = "checkbox";
  unavailable.checked = s?.includeUnavailable ?? false;
  const unavailableLabel = el("label", "", "check-label");
  unavailableLabel.append(unavailable, el("span", "Include unavailable files"));
  page.append(unavailableLabel, el("p", "Show previously collected assets whose original files are missing.", "note"));
  if (context?.warnings.length) for (const warning of context.warnings) page.append(el("p", warning, "note"));
  page.append(el("p", "Generated assets may be Git-ignored. Dependency folders, caches and symlinks outside approved roots remain excluded.", "note"), button("Save settings", () => void perform(async () => {
    const next = { includedFolders: s?.includedFolders ?? [], excludedFolders: excluded.value.split("\n").map((v) => v.trim()).filter(Boolean), maxSizeMB: Number(size.value), extensions: extensions.value.split(",").map((v) => v.trim().toLowerCase().replace(/^\./, "")), includeIgnored: s?.includeIgnored ?? false, includeUnavailable: unavailable.checked };
    await orca.plugin.request("library.settings", next);
    await savePrefs();
    await refreshContext();
    gallery();
    report("Settings saved");
  }), "primary"));
  scroller.replaceChildren(page);
  page.querySelector("button")?.focus();
}
async function refreshContext() {
  const next = await orca.plugin.request("library.context"), nextKey = JSON.stringify([next.active?.id, next.active?.root]), changed = !!context && activeWorkspaceKey !== nextKey;
  if (changed) {
    if (view === "gallery") savedScroll.set(scrollKey(), scroller.scrollTop);
    selection = void 0;
    detail?.dispose();
    detail = void 0;
    view = "gallery";
    controls.hidden = searchRow.hidden = false;
    scroller.replaceChildren(empty, grid.element);
  }
  context = next;
  activeWorkspaceKey = nextKey;
  if (view === "gallery") drawControls();
  return changed;
}
function onUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => void perform(async () => {
    const changed = await refreshContext();
    if (view === "gallery") {
      await reload(!changed);
      if (changed) scroller.scrollTop = savedScroll.get(scrollKey()) ?? 0;
    } else if (view === "inspector" && selection) {
      const next = await orca.plugin.request("library.detail", { id: selection.id });
      if (next.contentHash !== selection.contentHash || next.status !== selection.status) showInspector(next);
    }
  }), 160);
}
orca.plugin.on("library.changed", onUpdate);
orca.plugin.on("library.contextChanged", onUpdate);
orca.on("theme", () => {
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (view !== "gallery") gallery();
    else if (document.activeElement === searchInput && search) {
      e.preventDefault();
      clearSearch();
    }
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "f") {
    e.preventDefault();
    if (view !== "gallery") gallery(false);
    searchInput.focus({ preventScroll: true });
    searchInput.select();
  }
});
scroller.append(empty, loading, grid.element);
empty.hidden = grid.element.hidden = true;
void perform(async () => {
  const prefs = await orca.storage.get("panel.preferences.v1");
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    const savedFilter = prefs.filterVersion === 2 ? prefs.filter : prefs.filter === "svg" || prefs.filter === "animations" ? "images" : prefs.filter === "other" ? "markdown" : prefs.filter;
    if (["all", "images", "videos", "markdown", "other"].includes(String(savedFilter))) filter = savedFilter;
    if (["newest", "oldest", "filename", "size"].includes(String(prefs.sort))) sort = prefs.sort;
    if (prefs.galleryLayout === "list") galleryLayout = "list";
  }
  grid.setLayout(galleryLayout);
  updateViewButtons();
  await savePrefs();
  await refreshContext();
  await reload();
}).finally(() => {
  if (loading.isConnected) {
    loading.remove();
    empty.hidden = false;
    emptyTitle.textContent = "Assets Library is waiting for Orca";
    emptyDescription.textContent = "Open a supported local worktree.";
  }
});
