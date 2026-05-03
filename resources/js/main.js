import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment, RangeSetBuilder } from '@codemirror/state'
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'

// ---- Whitespace visualization ----

class GlyphWidget extends WidgetType {
  constructor(glyph, cls) { super(); this.glyph = glyph; this.cls = cls; }
  eq(o) { return this.glyph === o.glyph && this.cls === o.cls; }
  toDOM() {
    const s = document.createElement('span');
    s.className = this.cls;
    s.textContent = this.glyph;
    s.setAttribute('aria-hidden', 'true');
    return s;
  }
  ignoreEvent() { return false; }
}

function buildWsDecos(view) {
  const builder = new RangeSetBuilder();
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    for (let lStart = from; lStart <= to;) {
      const line = doc.lineAt(lStart);
      const lEnd = Math.min(line.to, to);
      for (let i = lStart; i < lEnd; i++) {
        const ch = doc.sliceString(i, i + 1);
        if (ch === ' ') {
          builder.add(i, i + 1, Decoration.replace({
            widget: new GlyphWidget('·', 'cm-ws-space'),
          }));
        } else if (ch === '\t') {
          builder.add(i, i + 1, Decoration.mark({ class: 'cm-ws-tab' }));
        }
      }
      if (lEnd < doc.length) {
        builder.add(lEnd, lEnd, Decoration.widget({
          widget: new GlyphWidget('↵', 'cm-ws-eol'),
          side: 1,
        }));
      }
      lStart = line.to + 1;
    }
  }
  return builder.finish();
}

const whitespaceExt = ViewPlugin.fromClass(
  class {
    constructor(v) { this.decorations = buildWsDecos(v); }
    update(u) { if (u.docChanged || u.viewportChanged) this.decorations = buildWsDecos(u.view); }
  },
  { decorations: v => v.decorations }
);

// ---- Compartments ----
const themeComp = new Compartment();
const fontComp  = new Compartment();
const wsComp    = new Compartment();
const langComp  = new Compartment();

// ---- State ----
let tabs        = [];
let activeTabId = null;
let isDark      = false;
let fontSize    = 13;
let fontFamily  = "'Cascadia Code', monospace";
let showWs      = false;
let showSyntax  = true;
let tabIdCounter = 0;
let view        = null;

const ENCODINGS = [
  { label: 'UTF-8',     decoder: 'utf-8'     },
  { label: 'Shift-JIS', decoder: 'shift-jis' },
  { label: 'EUC-JP',    decoder: 'euc-jp'    },
  { label: 'UTF-16 LE', decoder: 'utf-16le'  },
  { label: 'UTF-16 BE', decoder: 'utf-16be'  },
  { label: 'GBK',       decoder: 'gbk'       },
];

// ---- DOM ----
const tabsEl       = document.getElementById('tabs');
const editorWrap   = document.getElementById('editor-wrap');
const welcomeEl    = document.getElementById('welcome');
const btnOpen      = document.getElementById('btn-open');
const btnTheme     = document.getElementById('btn-theme');
const btnFontDown      = document.getElementById('btn-font-down');
const btnFontUp        = document.getElementById('btn-font-up');
const fontSizeSelect   = document.getElementById('font-size-select');
const btnSave      = document.getElementById('btn-save');
const btnSaveAs    = document.getElementById('btn-save-as');
const btnWs        = document.getElementById('btn-ws');
const btnSyntax    = document.getElementById('btn-syntax');
const fontSelect   = document.getElementById('font-select');
const statusFile   = document.getElementById('status-file');
const encSelect    = document.getElementById('enc-select');
const statusEol    = document.getElementById('status-eol');
const statusCursor = document.getElementById('status-cursor');

// ---- Helpers ----

function getLang(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return ({
    js: javascript(), jsx: javascript({ jsx: true }),
    ts: javascript({ typescript: true }), tsx: javascript({ jsx: true, typescript: true }),
    py: python(), json: json(),
    md: markdown(), markdown: markdown(),
    css: css(), html: html(), htm: html(),
  })[ext] ?? [];
}

function fontTheme() {
  return EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { overflow: 'auto', fontFamily, fontSize: `${fontSize}px` },
  });
}

function makeExtensions(filename) {
  return [
    basicSetup,
    langComp.of(showSyntax ? getLang(filename) : []),
    themeComp.of(isDark ? oneDark : []),
    fontComp.of(fontTheme()),
    wsComp.of(showWs ? whitespaceExt : []),
    EditorView.updateListener.of(update => {
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        statusCursor.textContent = `${line.number}:${pos - line.from + 1}`;
      }
      if (update.docChanged && activeTabId !== null) {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && !tab.modified) { tab.modified = true; renderTabs(); }
      }
    }),
  ];
}

function detectEol(content) {
  if (content.includes('\r\n')) return 'CRLF';
  if (content.includes('\r')) return 'CR';
  return 'LF';
}

function convertEol(text, target) {
  const lf = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (target === 'CRLF') return lf.replace(/\n/g, '\r\n');
  if (target === 'CR')   return lf.replace(/\n/g, '\r');
  return lf;
}

function detectEncoding(bytes) {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'UTF-8 BOM';
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return 'UTF-16 LE';
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return 'UTF-16 BE';
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return 'UTF-8'; } catch {}
  try { new TextDecoder('euc-jp', { fatal: true }).decode(bytes); return 'EUC-JP'; } catch {}
  return 'Shift-JIS';
}

// refreshAllTabs: dispatch effects to active view, apply same to inactive states
function refreshAllTabs(getEffects) {
  if (view && activeTabId !== null) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      view.dispatch({ effects: getEffects(tab.name) });
      tab.state = view.state;
    }
  }
  tabs.filter(t => t.id !== activeTabId).forEach(tab => {
    tab.state = tab.state.update({ effects: getEffects(tab.name) }).state;
  });
}

// ---- Tab management ----

function openTab(path, content, encoding, rawBytes) {
  const existing = tabs.find(t => t.path === path);
  if (existing) { activateTab(existing.id); return; }

  const filename = path.replace(/\\/g, '/').split('/').pop();
  const id = ++tabIdCounter;
  tabs.push({
    id, path, name: filename, encoding, rawBytes,
    eol: detectEol(content), modified: false,
    state: EditorState.create({ doc: content, extensions: makeExtensions(filename) }),
  });
  renderTabs();
  activateTab(id);
}

function activateTab(id) {
  if (activeTabId !== null && view) {
    const cur = tabs.find(t => t.id === activeTabId);
    if (cur) cur.state = view.state;
  }
  if (view) { view.destroy(); view = null; }
  activeTabId = id;

  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  welcomeEl.style.display = 'none';
  view = new EditorView({ state: tab.state, parent: editorWrap });
  view.dispatch({ effects: [
    themeComp.reconfigure(isDark ? oneDark : []),
    fontComp.reconfigure(fontTheme()),
    wsComp.reconfigure(showWs ? whitespaceExt : []),
    langComp.reconfigure(showSyntax ? getLang(tab.name) : []),
  ]});

  statusFile.textContent = tab.path;
  encSelect.value        = tab.encoding;
  statusEol.textContent  = tab.eol;
  renderTabs();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  tabs.splice(idx, 1);

  if (activeTabId === id) {
    if (view) { view.destroy(); view = null; }
    activeTabId = null;
    if (tabs.length > 0) {
      activateTab(tabs[Math.min(idx, tabs.length - 1)].id);
    } else {
      welcomeEl.style.display = 'flex';
      statusFile.textContent = '—';
      encSelect.value        = 'UTF-8';
      statusEol.textContent  = '—';
      statusCursor.textContent = '1:1';
    }
  }
  renderTabs();
}

function renderTabs() {
  tabsEl.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.innerHTML = `<span class="tab-name">${tab.modified ? '● ' : ''}${tab.name}</span><span class="tab-close">✕</span>`;
    el.addEventListener('click', e => {
      if (!e.target.classList.contains('tab-close')) activateTab(tab.id);
    });
    el.querySelector('.tab-close').addEventListener('click', e => {
      e.stopPropagation(); closeTab(tab.id);
    });
    tabsEl.appendChild(el);
  });
}

// ---- File open ----

async function openFile(path) {
  try {
    const buffer = await Neutralino.filesystem.readBinaryFile(path);
    const bytes  = new Uint8Array(buffer);
    const encoding = detectEncoding(bytes);
    const decoder = ENCODINGS.find(e => e.label === encoding)?.decoder ?? 'utf-8';
    const content  = new TextDecoder(decoder).decode(bytes);
    openTab(path, content, encoding, bytes);
  } catch (e) {
    console.error('openFile failed:', path, e);
  }
}

// ---- Event handlers ----

btnOpen.addEventListener('click', async () => {
  try {
    const paths = await Neutralino.os.showOpenDialog('ファイルを開く', {
      filters: [{ name: 'All files', extensions: ['*'] }],
    });
    if (paths?.length) for (const p of paths) await openFile(p);
  } catch {}
});

editorWrap.addEventListener('dragover', e => { e.preventDefault(); editorWrap.classList.add('drag-over'); });
editorWrap.addEventListener('dragleave', e => {
  if (!editorWrap.contains(e.relatedTarget)) editorWrap.classList.remove('drag-over');
});
editorWrap.addEventListener('drop', async e => {
  e.preventDefault();
  editorWrap.classList.remove('drag-over');
  for (const file of e.dataTransfer.files) if (file.path) await openFile(file.path);
});

btnTheme.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  btnTheme.textContent = isDark ? '☀' : '🌙';
  refreshAllTabs(() => [themeComp.reconfigure(isDark ? oneDark : [])]);
});

function applyFontSize(size) {
  fontSize = size;
  fontSizeSelect.value = String(size);
  refreshAllTabs(() => [fontComp.reconfigure(fontTheme())]);
}

btnFontDown.addEventListener('click', () => {
  const sizes = Array.from(fontSizeSelect.options).map(o => Number(o.value));
  const idx = sizes.indexOf(fontSize);
  if (idx > 0) applyFontSize(sizes[idx - 1]);
});

btnFontUp.addEventListener('click', () => {
  const sizes = Array.from(fontSizeSelect.options).map(o => Number(o.value));
  const idx = sizes.indexOf(fontSize);
  if (idx < sizes.length - 1) applyFontSize(sizes[idx + 1]);
});

fontSizeSelect.addEventListener('change', () => {
  applyFontSize(Number(fontSizeSelect.value));
});

fontSelect.addEventListener('change', () => {
  fontFamily = fontSelect.value;
  refreshAllTabs(() => [fontComp.reconfigure(fontTheme())]);
});

btnSave.addEventListener('click', () => saveFile());
btnSaveAs.addEventListener('click', () => saveFileAs());

btnWs.addEventListener('click', () => {
  showWs = !showWs;
  btnWs.classList.toggle('active', showWs);
  refreshAllTabs(() => [wsComp.reconfigure(showWs ? whitespaceExt : [])]);
});

btnSyntax.addEventListener('click', () => {
  showSyntax = !showSyntax;
  btnSyntax.classList.toggle('active', showSyntax);
  refreshAllTabs(name => [langComp.reconfigure(showSyntax ? getLang(name) : [])]);
});

// EOL conversion (click status to cycle)
statusEol.title = 'クリックで改行コードを変換';
statusEol.addEventListener('click', () => {
  if (!activeTabId || !view) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  const next = { LF: 'CRLF', CRLF: 'CR', CR: 'LF' }[tab.eol] ?? 'LF';
  const converted = convertEol(view.state.doc.toString(), next);
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: converted } });
  tab.eol = next;
  statusEol.textContent = next;
});

// Encoding re-decode via select
encSelect.addEventListener('change', () => {
  if (!activeTabId || !view) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.rawBytes) { encSelect.value = tab?.encoding ?? 'UTF-8'; return; }
  const selected = ENCODINGS.find(e => e.label === encSelect.value);
  if (!selected) return;
  try {
    const content = new TextDecoder(selected.decoder, { fatal: true }).decode(tab.rawBytes);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
    tab.encoding = selected.label;
  } catch {
    // デコード失敗時は元に戻す
    encSelect.value = tab.encoding;
  }
});

// ---- Save ----
async function saveFile() {
  if (!activeTabId || !view) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  try {
    await Neutralino.filesystem.writeFile(tab.path, view.state.doc.toString());
    tab.modified = false;
    renderTabs();
  } catch (e) {
    console.error('saveFile failed:', e);
  }
}

async function saveFileAs() {
  if (!activeTabId || !view) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  try {
    const path = await Neutralino.os.showSaveDialog('名前を付けて保存', {
      defaultPath: tab.name,
      filters: [{ name: 'All files', extensions: ['*'] }],
    });
    if (!path) return;
    await Neutralino.filesystem.writeFile(path, view.state.doc.toString());
    tab.path = path;
    tab.name = path.replace(/\\/g, '/').split('/').pop();
    tab.modified = false;
    statusFile.textContent = path;
    renderTabs();
  } catch (e) {
    console.error('saveFileAs failed:', e);
  }
}

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', async e => {
  if (!e.ctrlKey || e.altKey) return;
  switch (e.key) {
    case 'o': case 'O':
      e.preventDefault();
      btnOpen.click();
      break;
    case 'w': case 'W':
      e.preventDefault();
      if (activeTabId !== null) closeTab(activeTabId);
      break;
    case 's': case 'S':
      e.preventDefault();
      if (e.shiftKey) await saveFileAs();
      else await saveFile();
      break;
    case '=': case '+':
      e.preventDefault();
      btnFontUp.dispatchEvent(new MouseEvent('click'));
      break;
    case '-':
      e.preventDefault();
      btnFontDown.dispatchEvent(new MouseEvent('click'));
      break;
    case 'Tab':
      e.preventDefault();
      if (tabs.length < 2) break;
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const next = e.shiftKey
        ? tabs[(idx - 1 + tabs.length) % tabs.length]
        : tabs[(idx + 1) % tabs.length];
      activateTab(next.id);
      break;
  }
});

Neutralino.init();
Neutralino.events.on('windowClose', () => Neutralino.app.exit());
