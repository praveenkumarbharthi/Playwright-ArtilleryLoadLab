'use strict';

const SHARED_CSS = `
:root {
  --bg: #0f172a;
  --bg-elevated: #1e293b;
  --card: #1e293b;
  --border: #334155;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --pass: #22c55e;
  --fail: #ef4444;
  --warn: #f59e0b;
  --bar: #38bdf8;
  --bar-p95: #f97316;
  --shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Segoe UI", Inter, system-ui, -apple-system, sans-serif;
  line-height: 1.45;
}
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
}
h1 { margin: 0 0 8px; font-size: 28px; }
h2 { margin: 0 0 12px; font-size: 18px; }
.sub { color: var(--muted); margin: 0; }
.badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
}
.badge.pass { background: rgba(34, 197, 94, 0.15); color: var(--pass); border: 1px solid var(--pass); }
.badge.fail { background: rgba(239, 68, 68, 0.15); color: var(--fail); border: 1px solid var(--fail); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--shadow);
}
.card .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.card .value { font-size: 26px; font-weight: 700; margin-top: 6px; }
.card .hint { color: var(--muted); font-size: 12px; margin-top: 4px; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table-wrap { overflow-x: auto; }
th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
td code { overflow-wrap: anywhere; }
.ok { color: var(--pass); font-weight: 700; }
.bad { color: var(--fail); font-weight: 700; }
.meter {
  height: 10px;
  background: #0b1220;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.meter > span { display: block; height: 100%; background: var(--bar); }
.meter.p95 > span { background: var(--bar-p95); }
.bar-row { display: grid; grid-template-columns: 240px 1fr 80px; gap: 10px; align-items: center; margin: 8px 0; }
.note { color: var(--muted); font-size: 13px; }
footer { margin-top: 32px; color: var(--muted); font-size: 12px; }
code { background: #0b1220; padding: 1px 6px; border-radius: 6px; }
`;

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="page">
    ${body}
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMs(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }
  const n = Number(value);
  if (Math.abs(n) < 10 && n !== 0 && Math.abs(n) < 1) {
    return n.toFixed(3);
  }
  const rounded = Number(n.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ms`;
}

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }
  return Number(value).toFixed(digits);
}

function statusBadge(passed) {
  return passed
    ? '<span class="badge pass">passed</span>'
    : '<span class="badge fail">failed</span>';
}

module.exports = {
  SHARED_CSS,
  htmlPage,
  escapeHtml,
  formatMs,
  formatNumber,
  statusBadge
};
