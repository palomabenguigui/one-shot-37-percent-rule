// Simple bar charts and code panels in plain HTML (no chart library).

import { esc } from "./ui.js";

// Vertical bars. items: [{ label, sub, value, text }]. The highest bar is gold.
export function barChart({ title, items, max }) {
  const top = Math.max(...items.map((i) => i.value));
  const scale = max || top || 1;
  const bars = items
    .map(
      (i) => `
      <div class="bar-col ${i.value === top ? "top" : ""}">
        <div class="bar-value">${i.text}</div>
        <div class="bar-track"><div class="bar" style="height:${(i.value / scale) * 100}%"></div></div>
        <div class="bar-label">${esc(i.label)}</div>
        ${i.sub ? `<div class="bar-sub">${esc(i.sub)}</div>` : ""}
      </div>`
    )
    .join("");
  return `<div class="chart"><div class="chart-title">${title}</div><div class="bars">${bars}</div></div>`;
}

// Empty chart shown before the first live run.
export function emptyChart(title, labels, message) {
  const bars = labels
    .map((l) => `<div class="bar-col"><div class="bar-value">&nbsp;</div><div class="bar-track"></div><div class="bar-label">${esc(l)}</div></div>`)
    .join("");
  return `<div class="chart"><div class="chart-title">${title}</div><div class="bars">${bars}</div><div class="chart-overlay">${message}</div></div>`;
}

// ------------------------------------------------------------------ code panel

const KEYWORDS = /\b(def|return|if|elif|else|for|in|import|from|not|and|or|None|True|False)\b/;
const TOKEN = /("[^"]*"|'[^']*'|\b\d[\d_.]*\b|\b(?:def|return|if|elif|else|for|in|import|from|not|and|or|None|True|False)\b)/;

function highlightLine(line) {
  const hash = line.indexOf("#");
  const code = hash >= 0 ? line.slice(0, hash) : line;
  const comment = hash >= 0 ? line.slice(hash) : "";
  const parts = code.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    if (part.startsWith('"') || part.startsWith("'")) return `<span class="tok-str">${esc(part)}</span>`;
    if (KEYWORDS.test(part)) return `<span class="tok-kw">${part}</span>`;
    return `<span class="tok-num">${part}</span>`;
  });
  return parts.join("") + (comment ? `<span class="tok-com">${esc(comment)}</span>` : "");
}

export function codePanel(caption, source) {
  if (!source) return ""; // sim.py didn't load: show no panel rather than an empty one
  const body = source.split("\n").map(highlightLine).join("\n");
  return `
    <div class="code-panel">
      <div class="code-caption">${caption}</div>
      <pre><code>${body}</code></pre>
    </div>`;
}
