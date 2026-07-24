import ePub from "epubjs";
import JSZip from "jszip";
import { __ertr } from "../i18n.js";

export var Paginator = class {
  constructor() {
    this.spread = 0;
    this.total = 0;
    this.sw = 0;
  }
  /** Build the paginator. Returns [currentSpread, totalSpreads]. */
  async build(container, html, settings, savedSpread) {
    container.empty();
    const t = THEMES[settings.theme];
    this._vAlign = settings.vAlign || "top";
    this._vCache = null;
    this._blockGeom = null;
    this.clip = container.createDiv("er-clip");
    this.clip.style.cssText = `flex:1;align-self:stretch;overflow:hidden;position:relative;min-width:0;min-height:0;`;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    if (!container.offsetWidth) await new Promise((r) => setTimeout(r, 80));
    const aW = this.clip.offsetWidth || container.offsetWidth || 390;
    const aH = this.clip.offsetHeight || container.offsetHeight || 700;
    this.builtWidth = aW;
    const cols = settings.columns === "2" && aW > 700 ? 2 : 1;
    const gap = cols === 2 ? 48 : 0;
    const pad = cols === 2 ? 48 : aW > 780 ? Math.max(48, Math.round((aW - 720) / 2)) : aW <= 480 ? 16 : aW <= 600 ? 22 : 42;
    const padVt = aH <= 650 ? 20 : Math.min(cols === 2 ? 48 : 40, 40);
    const padVtBot = padVt;
    const aHinner = aH - padVt - padVtBot;
    const colW = (aW - gap * (cols - 1) - 0.5) / cols;
    const flowW = 1800 * (aW / cols);
    this.flow = this.clip.createDiv("er-flow");
    this.flow.style.cssText = `
      width:${flowW}px;
      height:${aHinner}px;
      column-width:${colW}px;
      column-gap:${gap}px;
      column-fill:auto;
      position:relative;
      orphans:2;
      widows:2;
      padding:${padVt}px 0 ${padVtBot}px;
      box-sizing:content-box;
      margin-top:0;
      font-family:${FONTS[settings.fontFamily]};
      font-size:${settings.fontSize}px;
      line-height:${settings.lineHeight};
      color:${t.text};
      background:${t.bg};
      overflow:hidden;
      user-select:text;
      -webkit-user-select:text;
      -webkit-touch-callout:default;
      will-change:transform;
      transition:none;`;
    this.flow.innerHTML = `<style>
.er-flow p{text-align:${settings.textAlign || "left"};overflow-wrap:break-word;word-break:normal;hyphens:auto;-webkit-hyphens:auto;break-inside:auto;-webkit-column-break-inside:auto;orphans:2;widows:2}
.er-flow .er-section,.er-flow .er-pdf-page-break{
  display:block;overflow:visible;contain:none;
  break-inside:auto;-webkit-column-break-inside:auto}
.er-flow p,.er-flow li{
  break-inside:auto;-webkit-column-break-inside:auto;orphans:2;widows:2}
.er-flow p,.er-flow h1,.er-flow h2,.er-flow h3,.er-flow h4{
  padding-left:${pad}px;padding-right:${pad}px;margin:0 0 .75em}
.er-flow h1,.er-flow h2,.er-flow h3,.er-flow h4{margin-top:1.1em;margin-bottom:.4em;break-after:avoid-column !important;break-after:avoid !important;-webkit-column-break-after:avoid !important;page-break-after:avoid !important;break-inside:avoid-column !important;break-inside:avoid !important;-webkit-column-break-inside:avoid !important;page-break-inside:avoid !important}
.er-flow .dropcap,.er-flow .drop-cap,.er-flow [class*="dropcap"],.er-flow [class*="drop-cap"],.er-flow [class*="initial"],.er-flow [class*="first-letter"],.er-flow span[style*="float"],.er-flow p::first-letter{float:none!important;display:inline!important;position:static!important;font-size:inherit!important;line-height:inherit!important;margin:0!important;padding:0!important;vertical-align:baseline!important}
.er-flow>p:first-of-type,.er-flow .er-section:first-child>p:first-child,
.er-flow .er-section:first-child>h1:first-child,.er-flow .er-section:first-child>h2:first-child,
.er-flow .er-section:first-child>h3:first-child{padding-top:${padVt}px}
.er-flow img{max-width:calc(100% - ${pad * 2}px);max-height:${aHinner - 12}px;height:auto;width:auto;object-fit:contain;display:block;margin:8px auto;break-inside:avoid;page-break-inside:avoid;-webkit-column-break-inside:avoid}
.er-flow figure{break-inside:avoid;-webkit-column-break-inside:avoid;margin:8px auto}
.er-flow .er-pdf-figure{margin:0 0 .9em;padding:0 ${pad}px;break-inside:avoid;-webkit-column-break-inside:avoid;text-align:center;position:relative}
/* One-click "note from this page" on image/scan pages, where there is no text to
   select and the usual highlight \u2192 note route simply doesn't exist. */
.er-flow .er-pdf-note-btn{position:absolute;top:8px;right:${pad + 8}px;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;padding:6px;cursor:pointer;
  background:${t.ui};color:${t.text};border:1px solid ${t.border};border-radius:9px;
  opacity:.55;transition:opacity .15s,transform .15s;z-index:2}
.er-flow .er-pdf-note-btn:hover{opacity:1;transform:scale(1.06)}
.er-flow .er-pdf-note-btn svg{width:18px;height:18px}
.er-flow .er-pdf-page-img{max-width:100%;max-height:${aHinner - 24}px;width:auto;height:auto;object-fit:contain;margin:4px auto;border:1px solid ${t.border};border-radius:10px;break-inside:avoid;-webkit-column-break-inside:avoid}
/* Program listings (PDF and EPUB): keep line breaks and indentation. Wraps rather
   than scrolls \u2014 a horizontal scrollbar has nowhere to live inside a paged column. */
.er-flow pre.er-code{margin:0 0 .85em;padding:.55em .7em;box-sizing:border-box;
  max-width:calc(100% - ${pad * 2}px);margin-left:${pad}px;margin-right:${pad}px;
  white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2;
  font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;
  font-size:.8em;line-height:1.45;background:${t.ui};border:1px solid ${t.border};
  border-radius:8px;break-inside:avoid;-webkit-column-break-inside:avoid}
.er-flow pre.er-code code{font:inherit;background:none;padding:0;color:inherit}
/* Contents pages: a dot leader must never be justified \u2014 stretching it turns the
   entry into a field of dots. Title left, page number right, one row each. */
.er-flow p.er-toc-line{display:flex;align-items:baseline;gap:8px;text-align:left !important;
  margin:0 0 .35em;padding-left:${pad}px;padding-right:${pad}px}
.er-flow p.er-toc-line .er-toc-t{flex:1;min-width:0}
.er-flow p.er-toc-line .er-toc-n{flex:none;opacity:.65;font-variant-numeric:tabular-nums}
/* Notes printed in a book's margin, lifted out of the listing they annotate. */
.er-flow .er-side-notes{margin:.2em ${pad}px .9em;padding:.5em .8em;border-left:2px solid ${t.border};
  background:color-mix(in srgb,${t.text} 4%,transparent);border-radius:0 8px 8px 0;
  break-inside:avoid;-webkit-column-break-inside:avoid}
.er-flow .er-side-notes p{padding:0 !important;margin:0 0 .4em;font-size:.9em;opacity:.85;text-align:left}
.er-flow .er-side-notes p:last-child{margin-bottom:0}
/* Inline identifiers inside prose \u2014 malloc(), ptr, --flag. */
.er-flow code{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;
  font-size:.86em;background:${t.ui};border:1px solid ${t.border};border-radius:4px;
  padding:0 .28em;overflow-wrap:anywhere}
/* Tables from technical books: readable inside a narrow paged column. */
.er-flow table.er-table{margin:0 ${pad}px .9em;border-collapse:collapse;
  max-width:calc(100% - ${pad * 2}px);font-size:.82em;line-height:1.4;
  break-inside:avoid;-webkit-column-break-inside:avoid}
.er-flow table.er-table th,.er-flow table.er-table td{border:1px solid ${t.border};
  padding:.3em .5em;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.er-flow table.er-table th{background:${t.ui};font-weight:700}
</style>${html}`;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const figMaxH = Math.max(40, aHinner - 24);
    for (const img of this.flow.querySelectorAll("img.er-pdf-lazy")) {
      const aw = parseFloat(img.getAttribute("width")) || 0;
      const ah = parseFloat(img.getAttribute("height")) || 0;
      if (!aw || !ah) continue;
      const host = img.parentElement;
      const hostW = host ? host.getBoundingClientRect().width - pad * 2 : colW - pad * 2;
      const maxW = Math.max(40, hostW);
      const scale = Math.min(1, maxW / aw, figMaxH / ah);
      img.style.width = `${Math.round(aw * scale)}px`;
      img.style.height = `${Math.round(ah * scale)}px`;
    }
    await new Promise((r) => requestAnimationFrame(r));
    const measure = () => {
      const els = [...this.flow.querySelectorAll("p,h1,h2,h3,h4")];
      const fRect = this.flow.getBoundingClientRect();
      let stride = aW / cols;
      if (els.length >= 2) {
        const firstX = els[0].getBoundingClientRect().left - fRect.left;
        let rough = 0, maxDelta = 0;
        for (const el of els) {
          const d = el.getBoundingClientRect().left - fRect.left - firstX;
          if (!rough && d > colW * 0.4) rough = d;
          if (d > maxDelta) maxDelta = d;
        }
        if (rough) stride = maxDelta / Math.max(1, Math.round(maxDelta / rough));
      }
      let lastX = 0;
      for (const el of this.flow.querySelectorAll("p,h1,h2,h3,h4,img")) {
        const r = el.getBoundingClientRect().right - fRect.left;
        if (r > lastX) lastX = r;
      }
      return { stride, n: Math.max(1, Math.ceil(lastX / stride)) };
    };
    let { stride: physStride, n: nPhys } = measure();
    this.flow.style.width = `${Math.ceil((nPhys + 0.5) * physStride) + pad}px`;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    ({ stride: physStride, n: nPhys } = measure());
    this.sw = physStride * cols;
    this.cols = cols;
    this._colX = /* @__PURE__ */ new Map();
    this._pitch = physStride;
    try {
      const fRect2 = this.flow.getBoundingClientRect();
      for (const el of this.flow.querySelectorAll("p,h1,h2,h3,h4")) {
        const x = el.getBoundingClientRect().left - fRect2.left;
        const k = Math.round(x / physStride);
        if (!this._colX.has(k) || x < this._colX.get(k)) this._colX.set(k, x);
      }
      const ks = [...this._colX.keys()];
      if (ks.length >= 3) {
        const n = ks.length;
        let sk = 0, sx = 0, skk = 0, skx = 0;
        for (const k of ks) {
          const x = this._colX.get(k);
          sk += k;
          sx += x;
          skk += k * k;
          skx += k * x;
        }
        const denom = n * skk - sk * sk;
        if (denom) {
          const fit = (n * skx - sk * sx) / denom;
          if (fit > 1 && Math.abs(fit - physStride) < physStride * 0.1) this._pitch = fit;
        }
      }
    } catch (e) {
      this._colX = null;
    }
    this.total = Math.max(1, Math.ceil(nPhys / cols));
    this.spread = Math.max(0, Math.min(savedSpread, this.total - 1));
    this.flow.style.transition = "transform .28s cubic-bezier(.4,0,.2,1)";
    this.applyTransform(false);
    return [this.spread, this.total];
  }
  // How far down to nudge the page so a short spread isn't stranded at the top.
  //
  // CSS multi-column can't centre a column's contents, so this measures how much
  // of the page the current spread actually fills and shifts the whole flow by
  // half the leftover. Geometry is cached per spread: it only changes when the
  // book is re-laid out, and reading through a long book would otherwise re-measure
  // thousands of blocks on every page turn.
  _vOffset() {
    const mode = this._vAlign || "top";
    if (mode === "top" || !this.flow) return 0;
    if (!this._vCache) this._vCache = /* @__PURE__ */ new Map();
    if (this._vCache.has(this.spread)) return this._vCache.get(this.spread);
    let off = 0;
    try {
      if (!this._blockGeom) {
        const fRect = this.flow.getBoundingClientRect();
        this._blockGeom = [...this._blocks()].map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - fRect.left, bottom: r.bottom - fRect.top };
        });
      }
      const from = this._spreadOffset(), to = from + this.sw;
      let maxBottom = 0;
      for (const g of this._blockGeom) if (g.x >= from - 2 && g.x < to - 2 && g.bottom > maxBottom) maxBottom = g.bottom;
      const height = this.flow.clientHeight || 0;
      if (maxBottom > 0 && height > 0) {
        const leftover = height - maxBottom;
        if (leftover > height * SHORT_PAGE_GAP) off = mode === "center" ? leftover / 2 : leftover;
      }
    } catch (e) {
      off = 0;
    }
    off = Math.round(off);
    this._vCache.set(this.spread, off);
    return off;
  }
  // Horizontal offset of the current spread, taken from the measured position of
  // its first column when that column is known. Falls back to stride×index for
  // columns holding no text block (a full-page image, say).
  _spreadOffset() {
    const k = this.spread * (this.cols || 1);
    const exact = this._colX && this._colX.get(k);
    if (typeof exact === "number") return exact;
    if (this._colX && this._colX.size) {
      let bestK = null;
      for (const kk of this._colX.keys()) {
        if (bestK === null || Math.abs(kk - k) < Math.abs(bestK - k)) bestK = kk;
      }
      if (bestK !== null) return this._colX.get(bestK) + (k - bestK) * (this._pitch || this.sw / (this.cols || 1));
    }
    return this.spread * this.sw;
  }
  applyTransform(animate = true) {
    this.flow.style.top = this._vOffset() + "px";
    const t = `translate3d(${-Math.round(this._spreadOffset())}px, 0, 0)`;
    if (!animate) {
      const prev = this.flow.style.transition;
      this.flow.style.transition = "none";
      this.flow.getBoundingClientRect();
      this.flow.style.transform = t;
      requestAnimationFrame(() => {
        this.flow.style.transition = prev || "transform .28s cubic-bezier(.4,0,.2,1)";
      });
    } else {
      this.flow.style.transform = t;
    }
  }
  next() {
    if (this.spread < this.total - 1)
      this.spread++;
    this.applyTransform();
    return [this.spread, this.total];
  }
  prev() {
    if (this.spread > 0)
      this.spread--;
    this.applyTransform();
    return [this.spread, this.total];
  }
  goTo(s) {
    this.spread = Math.max(0, Math.min(s, this.total - 1));
    this.applyTransform();
    return [this.spread, this.total];
  }
  jumpTo(s) {
    return this.goTo(s);
  }
  // ── Content anchor (device-independent reading position) ──────────────
  // All p/h blocks in reading (column-fill) order. The SAME sequence exists on
  // phone and PC, so a block's global index pins the exact reading spot.
  _blocks() {
    return this.flow ? this.flow.querySelectorAll("p,h1,h2,h3,h4") : [];
  }
  // Global index of the first block at the current spread's left edge. x grows
  // monotonically with DOM order under column-fill, so binary-search it.
  currentBlockIndex() {
    const blocks = this._blocks();
    if (!blocks.length || !this.sw) return 0;
    const fLeft = this.flow.getBoundingClientRect().left;
    const winLeft = this._spreadOffset() - 2;
    const xat = (i) => blocks[i].getBoundingClientRect().left - fLeft;
    let lo = 0, hi = blocks.length - 1, ans = blocks.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      if (xat(mid) >= winLeft) {
        ans = mid;
        hi = mid - 1;
      } else lo = mid + 1;
    }
    return ans;
  }
  // Spread that contains the block with the given global index.
  spreadForBlock(idx) {
    const blocks = this._blocks();
    if (!blocks.length || !this.sw || idx < 0) return 0;
    const el = blocks[Math.min(idx, blocks.length - 1)];
    const x = el.getBoundingClientRect().left - this.flow.getBoundingClientRect().left;
    const k = Math.round(x / (this.sw / (this.cols || 1)));
    return Math.max(0, Math.min(Math.floor(k / (this.cols || 1)), this.total - 1));
  }
  // The block element for the given global index (for the resume flash).
  blockEl(idx) {
    const blocks = this._blocks();
    if (!blocks.length) return null;
    return blocks[Math.min(Math.max(0, idx), blocks.length - 1)] || null;
  }
  get currentSpread() {
    return this.spread;
  }
  get currentPct() {
    return this.total > 1 ? this.spread / (this.total - 1) : 0;
  }
  get totalSpreads() {
    return this.total;
  }
};
export async function extractEpub(file, app) {
  var _a, _b, _c, _d;
  const buf = await app.vault.readBinary(file);
  const book = src_default(buf);
  await book.ready;
  const spineItems = book.spine.spineItems;
  const parts = [];
  for (const item of spineItems) {
    try {
      const doc = await item.load(book.load.bind(book));
      const body = (_b = (_a = doc.querySelector) == null ? void 0 : _a.call(doc, "body")) != null ? _b : doc;
      const imgs = Array.from((_d = (_c = body.querySelectorAll) == null ? void 0 : _c.call(body, "img")) != null ? _d : []);
      for (const img of imgs) {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) continue;
        try {
          const itemDir = (item.url || "").split("/").slice(0, -1).join("/");
          const resolved = src.startsWith("/") ? src : (itemDir ? itemDir + "/" + src : "/" + src).replace(/\/\.?\//g, "/");
          const dataUrl = await book.archive.getBase64(resolved);
          if (dataUrl) img.setAttribute("src", dataUrl);
        } catch (e) {
        }
      }
      const html = nodeToHtml(body);
      if (html.trim())
        parts.push(`<div class="er-section">${html}</div>`);
      item.unload();
    } catch (e) {
    }
  }
  book.destroy();
  return parts.join("\n");
}
