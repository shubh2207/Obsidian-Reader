import { __ertr } from "./i18n.js";

export var VIEW_TYPE = "elton-reader";
var DEFAULT = {
  // Interface language: "ru" (default) or "en".
  language: "ru",
  booksFolder: "",
  // ── Notes created from selections / highlights ────────────────────────────
  // Templater template applied to every new note ("" = create without a
  // template, just the quoted selection). Point this at your own template.
  noteTemplate: "",
  // Folder new notes are created in ("" = vault root).
  notesFolder: "",
  // Folder whose notes appear in the per-book "link to note" picker ("" = all).
  bookNotesFolder: "",
  // Opt-in: on a book's first open, automatically create a dedicated note named
  // after the book (in the book-notes folder, else the notes folder) and link it,
  // so every book gets its own note without manual picking. Requested by readers.
  autoBookNote: false,
  // Where reading data (progress, highlights, rescue backups) is stored.
  // "" = next to the books (the booksFolder). Set it to keep data in one place
  // regardless of where the books live.
  dataFolder: "",
  // Per-book template override, keyed by book path → template path. Lets a
  // given book (or genre) use a different note template than the global one.
  bookTemplates: {},
  // Keep highlight colours when exporting: wraps each quote in a coloured
  // <mark> (renders in vanilla Obsidian). Off = plain quotes without colour.
  exportColors: true,
  theme: "light",
  fontSize: 18,
  fontFamily: "georgia",
  lineHeight: 1.8,
  columns: "2",
  // Text alignment inside the reading column: "left" (default), "justify",
  // "center" or "right". Requested by readers who prefer a specific alignment.
  textAlign: "left",
  // Where a SHORT page sits vertically: "top" (default), "center" or "bottom".
  // The end of a chapter often fills only part of the page, leaving the text
  // stranded at the top with a large empty band underneath.
  vAlign: "top",
  // Opt-in: adds a "translate" button to the selection popup. Off by default
  // because translating sends the SELECTED FRAGMENT to Google's public endpoint —
  // that has to be a deliberate choice, never a surprise.
  translateEnabled: false,
  // Target language for that button (ISO code Google Translate understands).
  translateTo: "ru",
  // Per-book override for the backlink inserted into notes created from a
  // selection. Keyed by the book file's path → the note name to link to.
  // Empty/unset → fall back to the book file's own name.
  bookNoteLinks: {},
  // Books we've already shown the "pick a book note" prompt for (keyed by path),
  // so first-open asks once and never nags again.
  bookNotePrompted: {},
  // Per-book cover display mode in the library, keyed by path → "contain".
  // Default (no entry) = "cover" (fills the card, may crop). "contain" shows the
  // WHOLE cover in proportion over a soft blurred backdrop.
  coverFits: {},
  // How the user syncs their vault between devices. Progress & highlights are
  // stored AS FILES inside the vault, so they ride whatever sync is in use —
  // this is mostly informational + tunes how aggressively we re-read on open.
  syncMode: "auto",
  // Opt-in: on PDF pages that have BOTH a picture and extractable text, also show
  // the page artwork above the text. Off by default — by default an image is only
  // shown when the page's text can't be extracted (scans, full-page figures), so
  // there is never a screenshot duplicating text you can already read.
  // Pictures on pages that also have text. Was off by default on the theory that
  // people want clean text — but a subscriber had to open illustrated books in a
  // different reader to see whether they contained pictures at all, which is a
  // much worse failure than an occasional redundant image.
  pdfShowFiguresOnTextPages: true,
  // Library cover size = the grid column width in px (cards scale with it). The
  // user can change it live with the −/+ control in the library header.
  libCoverSize: 176,
  // Last category chip picked in the library ("all", "status:reading",
  // "folder:<name>", "tag:<name>"), so it survives reopening.
  libCategory: "all",
  // Is the "Расширенные" group in the reading panel expanded? Collapsed by
  // default so the panel opens showing only the controls used mid-book.
  readerAdvOpen: false,
  readerHistOpen: false,
  askNoteTitle: true,
  shortNoteTitles: true,
  // Colour used when a comment has to create the highlight it hangs on.
  defaultHlColor: "yellow",
  // Reader-assigned categories per book: { "<book path>": ["Психология", …] }.
  // Folders only take you so far — most people keep every book in one place, so
  // this is how a library gets categories without reorganising files on disk.
  bookTags: {},
  // How pages are turned. "buttons" = the ← → arrows / keys / swipe (default).
  // "click" = tap/click the left or right side of the page to turn it (the
  // middle stays neutral so you can still select text / dismiss popups).
  navMode: "buttons",
  // Daily reading-goal timer. Counts active reading time (pauses when you're
  // idle or the book isn't focused) and shows a progress bar toward the goal.
  timerEnabled: true,
  dailyGoalMin: 15,
  // Accumulated reading seconds per day: { "YYYY-MM-DD": seconds }. Kept to the
  // last ~90 days. Local (in data.json) — a personal habit log, not synced.
  readingLog: {},
  // Untrimmed lifetime reading total (seconds). readingLog is capped to ~90 days,
  // so this separate counter is what powers the honest "all-time" total shown to
  // readers who asked to see cumulative reading time.
  lifetimeSeconds: 0,
  // Content-first "immersive" chrome: the top/bottom bars gently dim after a few
  // seconds of no pointer movement, and brighten the instant you move again.
  immersive: true,
  // Set to true once the first-run welcome slideshow has been shown, so it never
  // pops up again on its own (can still be re-opened from Settings).
  onboarded: false,
  // Set once the stale "already asked" flags from older builds have been cleaned
  // up (see loadAll). Without this the repair would run on every start.
  promptedRepaired: false,
  figuresShownByDefault: false,
  einkMode: false,
  // Plugin version the reader last saw the "what's new" screen for. Drives the
  // post-update summary; empty on an existing install means "never tracked", and
  // the full history is shown once so the jump isn't silent.
  lastSeenVersion: ""
};
var THEMES = {
  // Maximum contrast, no tinting: anything softer turns to mush on an e-ink panel.
  eink: { bg: "#ffffff", text: "#000000", ui: "#ffffff", border: "#000000", accent: "#000000", muted: "#444444", backdrop: "#f0f0f0" },
  dark: { bg: "#12121a", text: "#ddd8f0", ui: "#1c1c2a", border: "#2e2e45", accent: "#7c6af7", muted: "#6a6880", backdrop: "#0a0a0f" },
  light: { bg: "#faf8f3", text: "#1a1a2e", ui: "#f0ede5", border: "#ddd9ce", accent: "#5548d9", muted: "#8a8678", backdrop: "#e8e5dc" },
  sepia: { bg: "#f5efe3", text: "#2c2416", ui: "#ece4d2", border: "#cfc4a8", accent: "#8B6914", muted: "#9a8a68", backdrop: "#e5dccb" }
};
var FONTS = {
  georgia: "Georgia,'Times New Roman',serif",
  lora: "'Lora',Georgia,serif",
  inter: "'Inter',system-ui,sans-serif"
};
var HL_COLORS = [
  { id: "yellow", name: __ertr("\u0416\u0451\u043B\u0442\u044B\u0439"), css: "rgba(255,206,64,.45)" },
  { id: "green", name: __ertr("\u0417\u0435\u043B\u0451\u043D\u044B\u0439"), css: "rgba(118,214,108,.42)" },
  { id: "blue", name: __ertr("\u0413\u043E\u043B\u0443\u0431\u043E\u0439"), css: "rgba(96,165,250,.42)" },
  { id: "pink", name: __ertr("\u0420\u043E\u0437\u043E\u0432\u044B\u0439"), css: "rgba(248,123,168,.42)" }
];
export function hlColorCss(id) {
  var c = HL_COLORS.find((x) => x.id === id);
  return c ? c.css : HL_COLORS[0].css;
}
export function erPath(p) {
  const s = String(p == null ? "" : p).trim();
  if (!s) return "";
  try {
    const n = (0, normalizePath)(s);
    return n === "/" ? "" : n;
  } catch (e) {
    return s.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  }
}
export function icon(n) {
  var _a;
  const m = {
    "arrow-left": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-4.2a8.4 8.4 0 0 1-1-4.3 8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 8.6 7.4z"/></svg>`,
    "list": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    "sliders": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
    "chevron-left": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    "chevron-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
    "refresh": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    "highlighter": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h3l6-6"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8z"/></svg>`,
    "trash": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    "note": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    "save": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    "download": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    "info": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    "more": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    "search": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    "cover-fit": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
    "cover-fill": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    // Outline, like every other icon in the selection popup — it was the only
    // filled one, which is why that row looked mismatched.
    "bookmark": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    "copy": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    "translate": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7M9 3v2c0 4.4-2.2 7-5 8"/><path d="M5 9c0 2.5 2.5 4.5 6 6"/><path d="M12.5 20l4.2-9.5L21 20M14.3 16.2h4.8"/></svg>`,
    "play": `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>`,
    "pause": `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg>`,
    "check": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    "rotate-ccw": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    "more-horizontal": `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
    "x": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    "plus": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
  };
  return (_a = m[n]) != null ? _a : "";
}
var SHORT_PAGE_GAP = 0.35;
var FOUND_PAINT_MS = 4e3;
var MAX_BOOK_COMMANDS = 60;