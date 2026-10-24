#!/usr/bin/env node
// Mechanical consistency checks for docs/ — the half of AGENTS.md that prose cannot enforce.
// Usage: node scripts/check-docs.mjs [--warnings-as-errors]
// Exit 0 = clean, 1 = at least one error.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--warnings-as-errors');

const errors = [];
const warnings = [];
const fail = (file, line, msg) => errors.push(`${file}:${line}  ${msg}`);
const warn = (file, line, msg) => warnings.push(`${file}:${line}  ${msg}`);

// Documents that describe what exists today. Paths and § references in these must resolve.
const SOURCE_DOCS = [
  'docs/Overview.md',
  'docs/PRD.md',
  'docs/Tech.md',
  'docs/Tech-Backend.md',
  'docs/Tech-Frontend.md',
  'docs/UI.md',
  'docs/DB.md',
  'docs/Decisions.md',
  'AGENTS.md',
];

// The two work trackers. Feature tasks and refactor campaigns share one shape, so they share
// every check below: index rows, subtask progress, the four mandatory lines.
const TRACKERS = [
  { dir: 'docs/tasks/active', pattern: /^task-.*\.md$/, label: 'active tasks' },
  { dir: 'docs/refactors/active', pattern: /^refactor-.*\.md$/, label: 'active campaigns' },
];

const listTracker = (t) =>
  existsSync(join(ROOT, t.dir)) ? readdirSync(join(ROOT, t.dir)).filter((f) => f.endsWith('.md')) : [];

// Documents that plan future work: § refs still checked, paths may not exist yet.
const PLAN_DOCS = TRACKERS.flatMap((t) => listTracker(t).map((f) => `${t.dir}/${f}`));

// Authoring templates are forms, not documents. Their placeholders are not real references, and
// docs/refactors/TEMPLATE.md is deliberately git-ignored, so it may be absent in a fresh clone.
const TEMPLATE_PATHS = ['docs/tasks/TEMPLATE.md', 'docs/refactors/TEMPLATE.md'];

const ALL_DOCS = [...SOURCE_DOCS, ...PLAN_DOCS];

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').split(/\r?\n/);
const docs = new Map();
for (const rel of ALL_DOCS) {
  if (!existsSync(join(ROOT, rel))) {
    errors.push(`missing document: ${rel}`);
    continue;
  }
  docs.set(rel, read(rel));
}

// Short name -> file, for resolving "PRD §4.8" style references.
const BY_NAME = {
  PRD: 'docs/PRD.md',
  UI: 'docs/UI.md',
  DB: 'docs/DB.md',
  Tech: 'docs/Tech.md',
  'Tech-Backend': 'docs/Tech-Backend.md',
  'Tech-Frontend': 'docs/Tech-Frontend.md',
  AGENTS: 'AGENTS.md',
  Overview: 'docs/Overview.md',
};

// ---------------------------------------------------------------- headings

// file -> { top: Map(number -> {title, line}), all: Set("4", "4.8"), order: [...] }
const headings = new Map();
for (const [rel, lines] of docs) {
  const top = new Map();
  const all = new Set();
  const order = [];
  lines.forEach((text, i) => {
    const m = /^(#{2,4})\s+(\d+(?:\.\d+)*)\.?\s+(.*)$/.exec(text);
    if (!m) return;
    const [, hashes, num, title] = m;
    all.add(num);
    if (hashes.length === 2 && !num.includes('.')) {
      top.set(num, { title: title.trim(), line: i + 1 });
      order.push({ num, line: i + 1 });
    }
  });
  headings.set(rel, { top, all, order });
}

// ------------------------------------------------- section index integrity

for (const rel of SOURCE_DOCS) {
  const lines = docs.get(rel);
  if (!lines) continue;
  const idx = lines.findIndex((l) => /^##\s+Section index\s*$/i.test(l));
  if (idx === -1) continue; // DB.md and Decisions.md have none, by design

  if (lines.some((l) => /^##\s+Table of contents/i.test(l))) {
    fail(rel, 1, 'has both a "Table of contents" and a "Section index" — keep only the index');
  }

  const { top } = headings.get(rel);
  const listed = new Set();
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;
    const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (!m) continue;
    const [, num, title] = m;
    listed.add(num);
    if (/\d+\s*[–—-]\s*\d+/.test(line)) {
      fail(rel, i + 1, `section index row ${num} carries a line range — indexes list headings only (D-011)`);
    }
    if (!top.has(num)) {
      fail(rel, i + 1, `section index lists §${num} but no "## ${num}." heading exists`);
    } else {
      const actual = top.get(num).title;
      const norm = (s) =>
        s
          .replace(/\([^)]*\)/g, ' ') // a parenthetical on either side is a gloss, not a mismatch
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
      const a = norm(actual);
      const b = norm(title);
      if (a !== b && !a.startsWith(b) && !b.startsWith(a)) {
        warn(rel, i + 1, `section index title "${title}" does not match heading "${actual}"`);
      }
    }
  }
  for (const [num, { line }] of top) {
    if (!listed.has(num)) fail(rel, line, `§${num} "${top.get(num).title}" is missing from the section index`);
  }
}

// -------------------------------------------------------- section size cap

// The cap applies to the smallest documented unit: a `###` subsection where one exists,
// otherwise the `##` section itself. A long catalogue of short subsections is fine.
const CAP = 150;
for (const rel of SOURCE_DOCS) {
  const lines = docs.get(rel);
  if (!lines) continue;
  const marks = [];
  lines.forEach((text, i) => {
    const m = /^(#{2,3})\s+(\d+(?:\.\d+)*)\.?\s+(.*)$/.exec(text);
    if (m) marks.push({ depth: m[1].length, num: m[2], line: i + 1 });
  });
  marks.forEach((h, n) => {
    const next = marks[n + 1];
    if (h.depth === 2 && next && next.depth === 3) return; // measured through its children
    const end = next ? next.line : lines.length + 1;
    const size = end - h.line;
    if (size > CAP) warn(rel, h.line, `§${h.num} is ${size} lines (cap ~${CAP}) — consider splitting (AGENTS §7)`);
  });
}

// ------------------------------------------------------- § cross-references

const NAMED_REF = /\b(PRD|UI|DB|Tech-Backend|Tech-Frontend|Tech|AGENTS|Overview)(?:\.md)?\s*§+\s*(\d+(?:\.\d+)*)/g;

for (const [rel, lines] of docs) {
  lines.forEach((text, i) => {
    if (/^\s*(\||>)/.test(text) && /section index/i.test(text)) return;
    for (const m of text.matchAll(NAMED_REF)) {
      const target = BY_NAME[m[1]];
      const num = m[2];
      const h = headings.get(target);
      if (!h) continue;
      if (!h.all.has(num)) {
        fail(rel, i + 1, `references ${m[1]} §${num}, which has no such heading in ${target}`);
      }
    }
  });
}

// ------------------------------------------------------ decision references

const decisionIds = new Set();
for (const line of docs.get('docs/Decisions.md') ?? []) {
  const m = /^###\s+(D-\d{3})\s+—/.exec(line);
  if (m) decisionIds.add(m[1]);
}
if (decisionIds.size === 0) errors.push('docs/Decisions.md defines no "### D-0NN — ..." entries');

for (const [rel, lines] of docs) {
  lines.forEach((text, i) => {
    for (const m of text.matchAll(/\bD-(\d{3})\b/g)) {
      const id = `D-${m[1]}`;
      if (rel === 'docs/Decisions.md' && text.startsWith('###')) continue;
      if (!decisionIds.has(id)) fail(rel, i + 1, `references ${id}, which is not an entry in docs/Decisions.md`);
    }
  });
}

for (const [, lines] of [...docs].filter(([r]) => r === 'docs/Decisions.md')) {
  lines.forEach((text, i) => {
    if (/\*\*Status:\*\*\s*OPEN/.test(text)) {
      warn('docs/Decisions.md', i + 1, 'OPEN decision — every section it blocks is unsafe to implement');
    }
  });
}

// Retired reference style: the Q-numbers that used to point at a deleted Q&A log.
for (const [rel, lines] of docs) {
  lines.forEach((text, i) => {
    if (/\bper\s+Q\d+\b/.test(text)) {
      fail(rel, i + 1, 'uses a retired "per QNN" reference — migrate it to a D-0NN entry');
    }
  });
}

// --------------------------------------------------------- Rules: contract

// A Rules: line is a list of document references. Fragments are separated by commas,
// middots or semicolons at parenthesis depth 0 — a comma inside "(a, b)" is prose.
const RULE_TOKEN = /^(PRD|UI|DB|Tech|Tech-Backend|Tech-Frontend|Decisions|none|§|D-\d{3})/;

function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === '·' || ch === ';')) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  out.push(buf);
  return out.map((p) => p.trim()).filter(Boolean);
}

for (const rel of PLAN_DOCS) {
  const lines = docs.get(rel);
  if (!lines) continue;
  lines.forEach((text, i) => {
    const m = /^Rules:\s*(.+)$/.exec(text.trim());
    if (!m) return;
    const body = m[1];
    if (/\btask[- ]?\d+\b/i.test(body) || /\bTask \d+ Overview\b/i.test(body)) {
      fail(rel, i + 1, 'Rules: names a task file — a task is a plan, never a rule source (AGENTS §0, D-010)');
    }
    for (const part of splitTopLevel(body)) {
      if (!RULE_TOKEN.test(part)) {
        warn(rel, i + 1, `Rules: fragment "${part}" does not start with a document name, §, D-0NN or "none"`);
      }
    }
  });
}

// Every subtask heading must carry the four mandatory lines. Any `####` heading is a subtask
// except the Overview and the campaign-only blocks, so ids like `22a.1` and `R01.3` both work
// without the checker needing to know the numbering scheme.
const NON_SUBTASK_HEADINGS = /^####\s+(Overview|Baseline|Out of scope|Rollback)\b/;

for (const rel of PLAN_DOCS) {
  const lines = docs.get(rel);
  if (!lines) continue;
  lines.forEach((text, i) => {
    if (!/^####\s/.test(text) || NON_SUBTASK_HEADINGS.test(text)) return;
    const block = lines.slice(i + 1, i + 16).join('\n');
    for (const key of ['Rules:', 'Not in scope:', 'Docs to update:', 'Verify:']) {
      if (!block.includes(key)) warn(rel, i + 1, `subtask is missing its "${key}" line (AGENTS §9)`);
    }
  });
}

// --------------------------------------------- task and campaign index integrity

// Progress is counted in SUBTASKS, not individual boxes: a subtask is done when it has
// at least one checkbox and every one of them is ticked.
export function subtaskProgress(lines) {
  const starts = [];
  lines.forEach((text, i) => {
    if (/^####\s/.test(text)) starts.push(i);
  });
  let done = 0;
  let total = 0;
  starts.forEach((start, n) => {
    const end = n + 1 < starts.length ? starts[n + 1] : lines.length;
    const boxes = lines.slice(start, end).filter((l) => /^\s*-\s\[[ x]\]/.test(l));
    if (boxes.length === 0) return;
    total++;
    if (boxes.every((l) => /^\s*-\s\[x\]/.test(l))) done++;
  });
  return { done, total };
}

let trackedFiles = 0;

for (const t of TRACKERS) {
  const indexRel = `${t.dir}/index.md`;
  const files = listTracker(t).filter((f) => t.pattern.test(f));
  trackedFiles += files.length;

  if (!docs.has(indexRel) && !existsSync(join(ROOT, indexRel))) {
    if (files.length) errors.push(`${t.dir} holds ${files.length} file(s) but has no index.md`);
    continue;
  }
  const indexLines = read(indexRel);

  // every linked file exists, and every file is linked
  const linked = new Set();
  indexLines.forEach((text, i) => {
    for (const m of text.matchAll(/\]\(((?:task|refactor)-[^)]+\.md)\)/g)) {
      linked.add(m[1]);
      if (!existsSync(join(ROOT, t.dir, m[1]))) {
        fail(indexRel, i + 1, `row links ${m[1]}, which does not exist`);
      }
    }
  });
  for (const f of files) {
    if (!linked.has(f)) errors.push(`${t.dir}/${f} exists but has no row in index.md`);
  }

  // the progress cell must match the ticked subtasks
  for (const f of files) {
    const { done, total } = subtaskProgress(read(`${t.dir}/${f}`));
    const row = indexLines.find((l) => l.includes(`](${f})`));
    if (!row) continue;
    const m = /\|\s*(\d+)\s*\/\s*(\d+)\s*\|/.exec(row);
    if (!m) {
      warn(indexRel, 1, `row for ${f} has no "done/total" progress cell`);
    } else if (Number(m[1]) !== done || Number(m[2]) !== total) {
      fail(
        indexRel,
        indexLines.indexOf(row) + 1,
        `${f} progress says ${m[1]}/${m[2]} but ${done}/${total} subtasks are fully ticked`,
      );
    }
  }
}

// --------------------------------------------------------- documented paths

const PREFIXES = ['', 'frontend/', 'frontend/src/', 'backend/', 'backend/StudentPortal/', 'docs/'];
const PATH_IN_BACKTICKS = /`([A-Za-z0-9_.\-]+(?:\/[A-Za-z0-9_.\-]+)+\.(?:ts|tsx|cs|md|json|sql|css|mjs|html))`/g;

for (const rel of SOURCE_DOCS) {
  const lines = docs.get(rel);
  if (!lines) continue;
  // Decisions.md is a historical record: it legitimately names files that were deleted.
  if (rel === 'docs/Decisions.md') continue;
  lines.forEach((text, i) => {
    for (const m of text.matchAll(PATH_IN_BACKTICKS)) {
      const p = m[1];
      // Skip globs, the old snapshot, filename placeholders like YYYY-MM or <name>, and the
      // authoring templates (one of which is intentionally git-ignored).
      if (p.includes('*') || p.startsWith('docs/old') || /YYYY|MM-|<|\{/.test(p)) continue;
      if (TEMPLATE_PATHS.includes(p)) continue;
      const found = PREFIXES.some((pre) => existsSync(join(ROOT, pre + p)));
      if (!found) warn(rel, i + 1, `documents path \`${p}\`, which does not exist on disk (AGENTS §7)`);
    }
  });
}

// ------------------------------------------------------------- docs/old ban

for (const [rel, lines] of docs) {
  lines.forEach((text, i) => {
    if (!text.includes('docs/old')) return;
    const sanctioned = rel === 'AGENTS.md' || rel === 'docs/Decisions.md' || rel === 'docs/Overview.md';
    if (!sanctioned) warn(rel, i + 1, 'mentions docs/old — it is never authoritative (D-012)');
  });
}

// ---------------------------------------------------------------- report

const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;

if (warnings.length) {
  console.log(`\n${plural(warnings.length, 'warning')}:`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (errors.length) {
  console.log(`\n${plural(errors.length, 'error')}:`);
  for (const e of errors) console.log(`  x ${e}`);
}

const hardFail = errors.length > 0 || (STRICT && warnings.length > 0);
if (hardFail) {
  console.log('\ncheck-docs: FAILED — fix the documents, do not bypass the hook (AGENTS §10).\n');
  process.exit(1);
}
console.log(
  `\ncheck-docs: OK (${docs.size} documents, ${decisionIds.size} decisions, ${trackedFiles} open tasks and campaigns)\n`,
);
