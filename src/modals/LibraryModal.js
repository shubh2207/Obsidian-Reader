import { Modal, Notice, Menu, setIcon, TFile, TFolder } from "obsidian";
import ePub from "epubjs";
import { __ertr } from "../i18n.js";
import { erPath, icon } from "../constants.js";

export function bookCategoryOf(bookPath, booksFolder) {
  const base = erPath(booksFolder);
  let rel = erPath(bookPath);
  if (base && rel.startsWith(base + "/")) rel = rel.slice(base.length + 1);
  const i = rel.indexOf("/");
  return i > 0 ? rel.slice(0, i) : "";
}
export function bookStatusOf(prog) {
  if (!prog || !prog.lastRead) return "new";
  const pct = typeof prog.percent === "number" ? prog.percent : 0;
  if (pct >= 98) return "done";
  if (pct > 0) return "reading";
  return "new";
}
function buildLibChips(files, booksFolder, getProgress, getTags) {
  const statuses = { reading: 0, new: 0, done: 0 };
  const folders = /* @__PURE__ */ new Map();
  const tags = /* @__PURE__ */ new Map();
  for (const f of files) {
    statuses[bookStatusOf(getProgress(f.path))]++;
    const cat = bookCategoryOf(f.path, booksFolder);
    folders.set(cat, (folders.get(cat) || 0) + 1);
    for (const t of getTags ? getTags(f.path) : []) tags.set(t, (tags.get(t) || 0) + 1);
  }
  const chips = [{ id: "all", label: __ertr("\u0412\u0441\u0435"), count: files.length }];
  if (statuses.reading) chips.push({ id: "status:reading", label: __ertr("\u0427\u0438\u0442\u0430\u044E"), count: statuses.reading });
  if (statuses.new) chips.push({ id: "status:new", label: __ertr("\u041D\u0435 \u043D\u0430\u0447\u0430\u0442\u044B\u0435"), count: statuses.new });
  if (statuses.done) chips.push({ id: "status:done", label: __ertr("\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E"), count: statuses.done });
  for (const [t, n] of [...tags.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru"))) {
    chips.push({ id: `tag:${t}`, label: t, count: n });
  }
  const named = [...folders.entries()].filter(([c]) => c).sort((a, b) => a[0].localeCompare(b[0], "ru"));
  if (named.length > 1 || named.length === 1 && folders.has("")) {
    for (const [cat, n] of named) chips.push({ id: `folder:${cat}`, label: cat, count: n });
    if (folders.get("")) chips.push({ id: "folder:", label: __ertr("\u0411\u0435\u0437 \u043F\u0430\u043F\u043A\u0438"), count: folders.get("") });
  }
  return chips;
}
export function filterLibBooks(files, chipId, query, booksFolder, getProgress, getTags) {
  const needle = (query || "").trim().toLowerCase();
  return files.filter((f) => {
    if (needle && !f.basename.toLowerCase().includes(needle)) return false;
    if (!chipId || chipId === "all") return true;
    if (chipId.startsWith("status:")) return bookStatusOf(getProgress(f.path)) === chipId.slice(7);
    if (chipId.startsWith("folder:")) return bookCategoryOf(f.path, booksFolder) === chipId.slice(7);
    if (chipId.startsWith("tag:")) return (getTags ? getTags(f.path) : []).includes(chipId.slice(4));
    return true;
  });
}
function bookTagsOf(settings, bookPath) {
  const m = settings && settings.bookTags || {};
  const v = m[bookPath];
  return Array.isArray(v) ? v.filter(Boolean) : [];
}
function allBookTags(settings) {
  const m = settings && settings.bookTags || {};
  const set = /* @__PURE__ */ new Set();
  for (const k of Object.keys(m)) for (const t of Array.isArray(m[k]) ? m[k] : []) if (t) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}
function parseBookTags(raw) {
  return String(raw || "").split(/[,;\n]+/).map((t) => t.trim().replace(/^#+/, "").trim()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i);
}
export var LibraryModal = class extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  async onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("er-modal-lib");
    contentEl.addClass("er-lib");
    const t = THEMES[this.plugin.settings.theme];
    modalEl.style.setProperty("--er-lib-bg", t.bg);
    modalEl.style.setProperty("--er-lib-text", t.text);
    modalEl.style.setProperty("--er-lib-card", t.ui);
    modalEl.style.setProperty("--er-lib-border", t.border);
    modalEl.style.setProperty("--er-lib-accent", t.accent);
    modalEl.style.setProperty("--er-lib-muted", t.muted);
    const hdr = contentEl.createDiv("er-lib-hdr");
    const brand = hdr.createDiv("er-lib-brand");
    brand.createDiv("er-lib-logo").setText("\u{1F4DA}");
    const hw = brand.createDiv("er-lib-hw");
    hw.createDiv("er-lib-title").setText(__ertr("\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430"));
    hw.createDiv("er-lib-sub").setText("Book Reader by Elton Labs");
    const addBtn = hdr.createDiv("er-lib-add");
    addBtn.setAttribute("role", "button");
    addBtn.setAttribute("tabindex", "0");
    addBtn.setAttribute("aria-label", __ertr("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u0438\u0433\u0443"));
    addBtn.innerHTML = icon("plus");
    addBtn.createSpan({ cls: "er-lib-add-label", text: __ertr("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u0438\u0433\u0443") });
    const doPick = () => this._pickBooks();
    addBtn.addEventListener("click", doPick);
    addBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        doPick();
      }
    });
    this._setupDropZone();
    const search = hdr.createDiv("er-lib-search");
    const sIc = search.createDiv("er-lib-search-ic");
    sIc.innerHTML = icon("search");
    const input = search.createEl("input", { cls: "er-lib-search-input", attr: { type: "text", placeholder: __ertr("\u041F\u043E\u0438\u0441\u043A \u043A\u043D\u0438\u0433\u0438\u2026"), spellcheck: "false" } });
    const count = hdr.createDiv("er-lib-count");
    const sizeWrap = hdr.createDiv("er-lib-size");
    const applySize = () => {
      const px = Math.max(110, Math.min(300, this.plugin.settings.libCoverSize || 176));
      if (this._grid) this._grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${px}px,1fr))`;
    };
    const mkSz = (label, d, aria) => {
      const b = sizeWrap.createDiv("er-lib-szbtn");
      b.setText(label);
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", async () => {
        this.plugin.settings.libCoverSize = Math.max(110, Math.min(300, (this.plugin.settings.libCoverSize || 176) + d));
        applySize();
        requestAnimationFrame(() => this._sizeCovers());
        await this.plugin.saveAll();
      });
    };
    mkSz("\u2212", -28, __ertr("\u041C\u0435\u043D\u044C\u0448\u0435 \u043E\u0431\u043B\u043E\u0436\u043A\u0438"));
    mkSz("+", 28, __ertr("\u0411\u043E\u043B\u044C\u0448\u0435 \u043E\u0431\u043B\u043E\u0436\u043A\u0438"));
    await this.plugin.refreshProgress();
    const folder = erPath(this.plugin.settings.booksFolder);
    const prefix = folder ? folder + "/" : "";
    const files = this.app.vault.getFiles().filter(
      (f) => (f.extension === "epub" || f.extension === "pdf" || f.extension === "fb2") && (prefix === "" || f.path.startsWith(prefix))
    );
    if (!files.length) {
      const e = contentEl.createDiv("er-lib-empty");
      e.createDiv("er-lib-empty-icon").setText("\u{1F5C2}");
      e.createDiv("er-lib-empty-text").setText(__ertr("\u041D\u0435\u0442 \u043A\u043D\u0438\u0433"));
      e.createDiv("er-lib-empty-hint").setText(folder || __ertr("\u0412\u0441\u0435 \u043F\u0430\u043F\u043A\u0438 vault"));
      const cta = e.createDiv("er-lib-empty-add");
      cta.setAttribute("role", "button");
      cta.setAttribute("tabindex", "0");
      cta.innerHTML = icon("plus");
      cta.createSpan({ text: __ertr("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u0438\u0433\u0443") });
      const goCta = () => this._pickBooks();
      cta.addEventListener("click", goCta);
      cta.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          goCta();
        }
      });
      return;
    }
    files.sort((a, b) => {
      var _a, _b, _c, _d;
      const pa = (_b = (_a = this.plugin.getProgress(a.path)) == null ? void 0 : _a.lastRead) != null ? _b : 0;
      const pb = (_d = (_c = this.plugin.getProgress(b.path)) == null ? void 0 : _c.lastRead) != null ? _d : 0;
      return pb !== pa ? pb - pa : a.basename.localeCompare(b.basename, "ru");
    });
    const chipsRow = contentEl.createDiv("er-lib-chips");
    const grid = contentEl.createDiv("er-lib-grid");
    const plural = (n) => {
      const a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return __ertr("\u043A\u043D\u0438\u0433");
      if (b > 1 && b < 5) return __ertr("\u043A\u043D\u0438\u0433\u0438");
      if (b === 1) return __ertr("\u043A\u043D\u0438\u0433\u0430");
      return __ertr("\u043A\u043D\u0438\u0433");
    };
    this._grid = grid;
    applySize();
    const getProg = (p) => this.plugin.getProgress(p);
    const getTags = (p) => bookTagsOf(this.plugin.settings, p);
    const chips = buildLibChips(files, folder, getProg, getTags);
    let active = this.plugin.settings.libCategory || "all";
    if (!chips.some((c) => c.id === active)) active = "all";
    const render = (q) => {
      grid.empty();
      const shown = filterLibBooks(files, active, q, folder, getProg, getTags);
      count.setText(`${shown.length} ${plural(shown.length)}`);
      if (!shown.length) {
        grid.createDiv("er-lib-noresult").setText(__ertr("\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"));
        return;
      }
      for (const f of shown) this.renderCard(grid, f);
      requestAnimationFrame(() => this._sizeCovers());
      [120, 350, 650].forEach((t2) => setTimeout(() => this._sizeCovers(), t2));
    };
    if (chips.length > 1) {
      chips.forEach((c) => {
        const el = chipsRow.createDiv("er-lib-chip");
        el.createSpan({ text: c.label });
        el.createSpan({ cls: "er-lib-chip-n", text: String(c.count) });
        if (c.id === active) el.addClass("er-lib-chip-on");
        el.addEventListener("click", async () => {
          active = c.id;
          chipsRow.querySelectorAll(".er-lib-chip").forEach((x) => x.removeClass("er-lib-chip-on"));
          el.addClass("er-lib-chip-on");
          this.plugin.settings.libCategory = c.id;
          await this.plugin._saveLocalData();
          render(input.value);
        });
      });
    } else {
      chipsRow.remove();
    }
    input.addEventListener("input", () => render(input.value));
    render("");
    this._coverResizeObs = new ResizeObserver(() => this._sizeCovers());
    this._coverResizeObs.observe(grid);
    setTimeout(() => input.focus(), 60);
  }
  // Open the OS file picker for the three supported formats, then import.
  _pickBooks() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".pdf,.epub,.fb2,application/pdf,application/epub+zip";
    inp.multiple = true;
    inp.style.display = "none";
    inp.addEventListener("change", async () => {
      const files = Array.from(inp.files || []);
      inp.remove();
      await this._importBooks(files);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  // Drag & drop OS files anywhere on the modal. Bound once to modalEl (which
  // survives a grid refresh), with a dashed overlay shown only while dragging.
  _setupDropZone() {
    if (this._dropBound) return;
    this._dropBound = true;
    const host = this.modalEl;
    const overlay = host.createDiv("er-lib-drop");
    const inner = overlay.createDiv("er-lib-drop-inner");
    inner.innerHTML = icon("plus");
    inner.createSpan({ text: __ertr("\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0444\u0430\u0439\u043B\u044B, \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0445 \u0432 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0443") });
    let depth = 0;
    const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
    host.addEventListener("dragenter", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      host.addClass("er-lib-dragging");
    });
    host.addEventListener("dragover", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    host.addEventListener("dragleave", (e) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) host.removeClass("er-lib-dragging");
    });
    host.addEventListener("drop", async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      host.removeClass("er-lib-dragging");
      await this._importBooks(Array.from(e.dataTransfer.files || []));
    });
  }
  // Where to drop an imported book. The configured "books folder" wins; if it is
  // empty (the common case), land the file where most books already live so it
  // joins the existing library instead of the vault root. Only falls back to root
  // when the vault has no books yet.
  _targetDir() {
    const set = erPath(this.plugin.settings.booksFolder || "");
    if (set) return set;
    const exts = ["pdf", "epub", "fb2"];
    const counts = /* @__PURE__ */ new Map();
    for (const f of this.app.vault.getFiles()) {
      if (!exts.includes(f.extension)) continue;
      const dir = f.parent && f.parent.path && f.parent.path !== "/" ? f.parent.path : "";
      counts.set(dir, (counts.get(dir) || 0) + 1);
    }
    let best = "", bestN = -1;
    for (const [dir, n] of counts) if (n > bestN) {
      best = dir;
      bestN = n;
    }
    return best;
  }
  // A collision-free destination path inside the books folder (or vault root),
  // sanitised for the filesystem and suffixed " (1)", " (2)"… if the name is taken.
  _freeBookPath(dir, name) {
    const clean = (name || "book").replace(/[\\/:*?"<>|\n\r\t]/g, "_").trim() || "book";
    const dot = clean.lastIndexOf(".");
    const base = dot > 0 ? clean.slice(0, dot) : clean;
    const ext = dot > 0 ? clean.slice(dot) : "";
    const join = (b) => (dir ? dir + "/" : "") + b + ext;
    let p = join(base), i = 1;
    while (this.app.vault.getAbstractFileByPath(p)) p = join(`${base} (${i++})`);
    return p;
  }
  // Import a list of picked/dropped File objects: keep only supported formats,
  // write each into the books folder as a real vault file, then refresh the grid.
  async _importBooks(fileList) {
    const exts = ["pdf", "epub", "fb2"];
    const all = fileList || [];
    const picked = all.filter((f) => exts.includes((f.name.split(".").pop() || "").toLowerCase()));
    const rejected = all.length - picked.length;
    if (!picked.length) {
      new Notice(rejected ? __ertr("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u044B PDF, EPUB \u0438 FB2") : __ertr("\u0424\u0430\u0439\u043B\u044B \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B"));
      return;
    }
    const dir = this._targetDir();
    if (dir && !this.app.vault.getAbstractFileByPath(dir)) {
      await this.app.vault.createFolder(dir).catch(() => {
      });
    }
    let ok = 0;
    const errors = [];
    for (const f of picked) {
      try {
        const buf = await f.arrayBuffer();
        await this.app.vault.createBinary(this._freeBookPath(dir, f.name), buf);
        ok++;
      } catch (err) {
        console.warn("Book Reader: could not import", f && f.name, err);
        errors.push(f.name);
      }
    }
    if (ok) new Notice(__ertr("\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u043A\u043D\u0438\u0433: {0}", ok) + (rejected ? " \xB7 " + __ertr("\u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: {0}", rejected) : ""));
    if (errors.length) new Notice(__ertr("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C: {0}", errors.join(", ")));
    if (ok) this._refresh();
  }
  // Rebuild the library in place after books were added, without a modal flash.
  _refresh() {
    if (this._coverResizeObs) {
      try {
        this._coverResizeObs.disconnect();
      } catch (e) {
      }
    }
    this.contentEl.empty();
    this.onOpen();
  }
  _sizeCovers() {
    if (!this._grid) return;
    this._grid.querySelectorAll(".er-lib-cover").forEach((c) => {
      const w = c.offsetWidth;
      if (!w) return;
      const h = c.offsetHeight;
      if (h < w * 1.35 || h > w * 1.65) c.style.setProperty("height", Math.round(w * 1.5) + "px", "important");
      else c.style.removeProperty("height");
    });
  }
  renderCard(grid, file) {
    var _a, _b;
    const prog = this.plugin.getProgress(file.path);
    const pct = (_a = prog == null ? void 0 : prog.percent) != null ? _a : 0;
    const card = grid.createDiv("er-lib-card");
    const cover = card.createDiv("er-lib-cover");
    const fits = (_b = this.plugin.settings.coverFits) != null ? _b : this.plugin.settings.coverFits = {};
    if (fits[file.path] === "fill") cover.addClass("er-fit-fill");
    const ph = cover.createDiv("er-lib-ph");
    ph.createDiv("er-lib-ph-ext").setText(file.extension.toUpperCase());
    ph.createDiv("er-lib-ph-init").setText(file.basename.slice(0, 2).toUpperCase());
    this.loadThumb(file, cover, ph);
    const fitBtn = cover.createDiv("er-lib-fitbtn");
    fitBtn.setAttribute("aria-label", __ertr("\u0412\u0438\u0434 \u043E\u0431\u043B\u043E\u0436\u043A\u0438"));
    const applyFit = () => {
      const fill = cover.hasClass("er-fit-fill");
      cover.style.setProperty("background-size", fill ? "cover" : "contain", "important");
      fitBtn.innerHTML = fill ? icon("cover-fit") : icon("cover-fill");
    };
    applyFit();
    fitBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nowFill = !cover.hasClass("er-fit-fill");
      cover.toggleClass("er-fit-fill", nowFill);
      if (nowFill) fits[file.path] = "fill";
      else delete fits[file.path];
      applyFit();
      this.plugin.saveAll();
    });
    if (pct > 0) {
      const s = cover.createDiv("er-lib-strip");
      s.createDiv("er-lib-strip-fill").style.width = `${pct}%`;
    }
    const info = card.createDiv("er-lib-info");
    info.createDiv("er-lib-book-title").setText(file.basename);
    const meta = info.createDiv("er-lib-book-meta");
    if (prog == null ? void 0 : prog.lastRead) {
      meta.setText(`${pct}% \xB7 ${new Date(prog.lastRead).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`);
    } else {
      meta.setText(__ertr("\u041D\u0435 \u0447\u0438\u0442\u0430\u043B\u0430\u0441\u044C"));
    }
    card.addEventListener("click", () => {
      this.close();
      this.plugin.openFile(file);
    });
  }
  async loadThumb(file, coverEl, ph) {
    if (this.plugin.thumbCache[file.path]) {
      this.showImg(coverEl, ph, this.plugin.thumbCache[file.path]);
      return;
    }
    this._thumbQueue = (this._thumbQueue || Promise.resolve()).then(async () => {
      if (this.plugin.thumbCache[file.path]) {
        this.showImg(coverEl, ph, this.plugin.thumbCache[file.path]);
        return;
      }
      try {
        const url = file.extension === "pdf" ? await this.makePdfThumb(file) : file.extension === "fb2" ? await this.makeFb2Thumb(file) : await this.makeEpubThumb(file);
        if (!url) return;
        this.plugin.thumbCache[file.path] = url;
        this._thumbDirty = true;
        this.showImg(coverEl, ph, url);
      } catch (e) {
        console.warn("Book Reader: cover failed for", file.path, e);
      }
    }).then(() => {
      clearTimeout(this._thumbSaveT);
      this._thumbSaveT = setTimeout(() => {
        if (this._thumbDirty) {
          this._thumbDirty = false;
          this.plugin._saveThumbCache();
        }
      }, 800);
    });
    return this._thumbQueue;
  }
  showImg(coverEl, ph, src) {
    if (!src) return;
    ph.style.display = "none";
    coverEl.style.setProperty("background-image", `url("${src.replace(/"/g, '\\"')}")`, "important");
    coverEl.style.setProperty("background-position", "center", "important");
    coverEl.style.setProperty("background-repeat", "no-repeat", "important");
    coverEl.style.setProperty("background-size", coverEl.hasClass("er-fit-fill") ? "cover" : "contain", "important");
    coverEl.addClass("er-has-cover");
  }
  async makePdfThumb(file) {
    await setupWorker(this.app);
    const buf = await this.app.vault.readBinary(file);
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, Math.max(1, 520 / (base.width || 400)));
    const vp = page.getViewport({ scale });
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(vp.width);
    cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const url = cv.toDataURL("image/jpeg", 0.85);
    doc.destroy();
    return url;
  }
  // FB2 keeps its cover as a base64 <binary>, so the "thumbnail" is already a
  // data URL — no rendering needed. Falls back to the first image in the file
  // when the description declares no coverpage.
  async makeFb2Thumb(file) {
    const buf = await this.app.vault.readBinary(file);
    const bytes = new Uint8Array(buf);
    if (bytes[0] === 80 && bytes[1] === 75) throw new Error("fb2 is zipped");
    const doc = new DOMParser().parseFromString(decodeFb2(buf), "application/xml");
    const cp = doc.getElementsByTagName("coverpage")[0];
    const img = cp && cp.getElementsByTagName("image")[0];
    const id = img ? fb2Href(img) : "";
    const bins = Array.from(doc.getElementsByTagName("binary"));
    const bin = id && bins.find((b) => b.getAttribute("id") === id) || bins[0];
    if (!bin) throw new Error("no cover");
    const data = (bin.textContent || "").replace(/\s+/g, "");
    if (!data) throw new Error("no cover");
    return `data:${bin.getAttribute("content-type") || "image/jpeg"};base64,${data}`;
  }
  async makeEpubThumb(file) {
    const buf = await this.app.vault.readBinary(file);
    const book = ePub(buf);
    await book.ready;
    const coverUrl = await book.coverUrl();
    book.destroy();
    if (!coverUrl)
      throw new Error("no cover");
    const resp = await fetch(coverUrl);
    const blob = await resp.blob();
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  onClose() {
    var _a;
    clearTimeout(this._thumbSaveT);
    if (this._thumbDirty) {
      this._thumbDirty = false;
      this.plugin.saveAll();
    }
    (_a = this._coverResizeObs) == null ? void 0 : _a.disconnect();
    this.contentEl.empty();
  }
};