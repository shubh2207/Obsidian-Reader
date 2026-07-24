import * as pdfjsLib from "pdfjs-dist";
import { __ertr } from "../i18n.js";

export async function extractPdf(file, app, settings = {}, onProgress) {
  await setupWorker(app);
  const alsoFigOnText = settings.pdfShowFiguresOnTextPages === true;
  const buf = await app.vault.readBinary(file);
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = doc.numPages;
  const parts = [];
  const figRects = {};
  for (let i = 1; i <= total; i++) {
    if (onProgress && (i === 1 || i % 4 === 0 || i === total)) onProgress(i, total);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const textLen = tc.items.reduce((n, it) => n + (typeof it.str === "string" ? it.str.replace(/\s+/g, "").length : 0), 0);
    const view = page.view || [0, 0, 612, 792];
    const pw = Math.max(1, Math.round(Math.abs(view[2] - view[0])));
    const ph = Math.max(1, Math.round(Math.abs(view[3] - view[1])));
    const textHtml = textLen > 0 ? pdfItemsToHtml(tc.items, tc.styles) : "";
    let html = textHtml;
    if (textLen < 40) {
      const fig = await pdfFigureScore(page);
      if (fig && (fig.imgFrac >= 0.02 || fig.vectorOps >= 20 || fig.shading > 0)) {
        html = `<figure class="er-pdf-figure"><img class="er-pdf-page-img er-pdf-lazy" data-pdf-page="${i}" width="${pw}" height="${ph}" alt="">${pdfNoteBtn(i)}</figure>` + textHtml;
      }
    } else if (alsoFigOnText) {
      const fig = await pdfFigureScore(page);
      const picked = fig ? pdfPickFigures(fig.rects, view) : [];
      if (picked.length) {
        figRects[i] = picked;
        const figsHtml = picked.map((r, k) => {
          const rw = Math.max(1, Math.round(r.x1 - r.x0));
          const rh = Math.max(1, Math.round(r.y1 - r.y0));
          return `<figure class="er-pdf-figure"><img class="er-pdf-page-img er-pdf-lazy" data-pdf-page="${i}" data-pdf-rect="${k}" width="${rw}" height="${rh}" alt=""></figure>`;
        }).join("");
        html = figsHtml + textHtml;
      } else if (fig && fig.imgFrac >= 0.02) {
        html = `<figure class="er-pdf-figure"><img class="er-pdf-page-img er-pdf-lazy" data-pdf-page="${i}" width="${pw}" height="${ph}" alt="">${pdfNoteBtn(i)}</figure>` + textHtml;
      }
    }
    if (html) parts.push(`<div class="er-pdf-page-break" data-pdf-page-no="${i}">${html}</div>`);
  }
  const outline = [];
  try {
    const walk2 = async (nodes, level) => {
      for (const n of nodes || []) {
        let page = null;
        try {
          const dest = typeof n.dest === "string" ? await doc.getDestination(n.dest) : n.dest;
          if (Array.isArray(dest) && dest[0]) page = await doc.getPageIndex(dest[0]) + 1;
        } catch (e) {
        }
        const label = String(n.title || "").replace(/\s+/g, " ").trim();
        if (label && page) outline.push({ label, page, level });
        if (n.items && n.items.length) await walk2(n.items, level + 1);
      }
    };
    await walk2(await doc.getOutline(), 0);
  } catch (e) {
    console.warn("Book Reader: PDF outline unavailable", e);
  }
  const lazy = {
    _doc: doc,
    _rects: figRects,
    // rectIdx === null → the whole page (a scan: the page IS the content).
    // Otherwise crop to one picture: the canvas is sized to the FIGURE and the
    // context shifted, so only that region lands on it — the reader sees the
    // illustration itself rather than a screenshot of the page around it.
    async render(pageNum, rectIdx) {
      const page = await doc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const r = rectIdx == null ? null : (this._rects[pageNum] || [])[rectIdx] || null;
      if (!r) {
        const scale2 = Math.max(1, Math.min(2, 1600 / Math.max(base.width, base.height, 1)));
        const vp2 = page.getViewport({ scale: scale2 });
        const cv2 = document.createElement("canvas");
        cv2.width = Math.ceil(vp2.width);
        cv2.height = Math.ceil(vp2.height);
        const ctx2 = cv2.getContext("2d");
        ctx2.fillStyle = "#ffffff";
        ctx2.fillRect(0, 0, cv2.width, cv2.height);
        await page.render({ canvasContext: ctx2, viewport: vp2 }).promise;
        return cv2.toDataURL("image/jpeg", 0.78);
      }
      const rw = Math.max(1, r.x1 - r.x0), rh = Math.max(1, r.y1 - r.y0);
      const scale = Math.max(1, Math.min(3, 1400 / Math.max(rw, rh)));
      const vp = page.getViewport({ scale });
      const [ax, ay] = vp.convertToViewportPoint(r.x0, r.y0);
      const [bx, by] = vp.convertToViewportPoint(r.x1, r.y1);
      const left = Math.min(ax, bx), top = Math.min(ay, by);
      const cw = Math.max(1, Math.round(Math.abs(bx - ax)));
      const ch = Math.max(1, Math.round(Math.abs(by - ay)));
      const cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.translate(-left, -top);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      return cv.toDataURL("image/jpeg", 0.85);
    },
    destroy() {
      try {
        doc.destroy();
      } catch (e) {
      }
    }
  };
  return { html: parts.join("\n"), lazy, outline };
}