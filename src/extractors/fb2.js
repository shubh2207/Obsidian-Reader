import { __ertr } from "../i18n.js";

export function decodeFb2(buf) {
  const bytes = new Uint8Array(buf);
  let head = "";
  for (let i = 0; i < Math.min(bytes.length, 256); i++) head += String.fromCharCode(bytes[i]);
  const m = head.match(/encoding\s*=\s*["']([\w-]+)["']/i);
  const enc = (m ? m[1] : "utf-8").toLowerCase();
  try {
    return new TextDecoder(enc).decode(bytes);
  } catch (e) {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
function fb2Href(el) {
  let href = "";
  try {
    href = el.getAttributeNS("http://www.w3.org/1999/xlink", "href") || "";
  } catch (e) {
  }
  if (!href) {
    for (const a of Array.from(el.attributes || [])) {
      if (a.name === "href" || a.name.endsWith(":href")) {
        href = a.value;
        break;
      }
    }
  }
  return href.replace(/^#/, "");
}
function fb2ImgSrc(el, images) {
  const id = fb2Href(el);
  return id ? images[id] || "" : "";
}
function fb2Img(src) {
  return `<img src="${escHtml(src)}" style="max-width:100%;height:auto;display:block;margin:8px auto">`;
}
function fb2Inline(el) {
  let out = "";
  for (const node of Array.from(el.childNodes || [])) {
    if (node.nodeType === 3) {
      out += escHtml(node.textContent || "");
      continue;
    }
    if (node.nodeType !== 1) continue;
    const t = (node.tagName || "").toLowerCase();
    const inner = fb2Inline(node);
    if (t === "emphasis") out += `<i>${inner}</i>`;
    else if (t === "strong") out += `<b>${inner}</b>`;
    else if (t === "strikethrough") out += `<s>${inner}</s>`;
    else if (t === "sup") out += `<sup>${inner}</sup>`;
    else if (t === "sub") out += `<sub>${inner}</sub>`;
    else if (t === "code") out += `<code>${inner}</code>`;
    else out += inner;
  }
  return out;
}
function fb2IsCodeLine(el) {
  const all = (el.textContent || "").replace(/\s/g, "").length;
  if (!all) return false;
  let inCode = 0;
  for (const c of Array.from(el.children || [])) {
    if ((c.tagName || "").toLowerCase() === "code") inCode += (c.textContent || "").replace(/\s/g, "").length;
  }
  return inCode / all >= 0.9;
}
function fb2MergeCode(out) {
  const html = [];
  let block = null;
  const flush = () => {
    if (!block || !block.length) {
      block = null;
      return;
    }
    const body = block.join("\n");
    if (body.trim()) html.push(`<pre class="er-code"><code>${escHtml(body)}</code></pre>`);
    block = null;
  };
  for (const item of out) {
    if (item && typeof item === "object" && typeof item.codeLine === "string") {
      (block || (block = [])).push(item.codeLine);
      continue;
    }
    flush();
    if (typeof item === "string") html.push(item);
  }
  flush();
  return html;
}
function fb2Node(el, images, out) {
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "title") {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t) out.push(`<h2>${escHtml(t)}</h2>`);
    return;
  }
  if (tag === "subtitle") {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t) out.push(`<h3>${escHtml(t)}</h3>`);
    return;
  }
  if (tag === "p" || tag === "v" || tag === "text-author") {
    if (tag === "p" && fb2IsCodeLine(el)) {
      out.push({ codeLine: (el.textContent || "").replace(/\s+$/, "") });
      return;
    }
    const raw = (el.textContent || "").replace(/\s+/g, " ").trim();
    const toc = tocLineHtml(raw);
    if (toc) {
      out.push(toc);
      return;
    }
    const inner = fb2Inline(el);
    if (inner.trim()) out.push(`<p>${inner}</p>`);
    return;
  }
  if (tag === "empty-line") return;
  if (tag === "image") {
    const src = fb2ImgSrc(el, images);
    if (src) out.push(fb2Img(src));
    return;
  }
  if (tag === "binary" || tag === "description") return;
  for (const child of Array.from(el.children || [])) fb2Node(child, images, out);
}
export async function extractFb2(file, app) {
  const buf = await app.vault.readBinary(file);
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 80 && bytes[1] === 75) {
    new Notice(__ertr("\u042D\u0442\u043E\u0442 FB2 \u0443\u043F\u0430\u043A\u043E\u0432\u0430\u043D \u0432 ZIP. \u0420\u0430\u0441\u043F\u0430\u043A\u0443\u0439\u0442\u0435 \u0430\u0440\u0445\u0438\u0432 \u0438 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0441\u0430\u043C \u0444\u0430\u0439\u043B .fb2."), 8e3);
    throw new Error("FB2 is zipped");
  }
  const doc = new DOMParser().parseFromString(decodeFb2(buf), "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("FB2 parse error");
  const images = {};
  for (const b of Array.from(doc.getElementsByTagName("binary"))) {
    const id = b.getAttribute("id");
    const ct = b.getAttribute("content-type") || "image/jpeg";
    const data = (b.textContent || "").replace(/\s+/g, "");
    if (id && data) images[id] = `data:${ct};base64,${data}`;
  }
  const parts = [];
  const cp = doc.getElementsByTagName("coverpage")[0];
  const coverImg = cp && cp.getElementsByTagName("image")[0];
  if (coverImg) {
    const src = fb2ImgSrc(coverImg, images);
    if (src) parts.push(`<div class="er-section">${fb2Img(src)}</div>`);
  }
  for (const body of Array.from(doc.getElementsByTagName("body"))) {
    for (const child of Array.from(body.children || [])) {
      const out = [];
      fb2Node(child, images, out);
      const html = fb2MergeCode(out).join("\n");
      if (html.trim()) parts.push(`<div class="er-section">${html}</div>`);
    }
  }
  if (!parts.length) throw new Error("FB2 has no readable text");
  return parts.join("\n");
}